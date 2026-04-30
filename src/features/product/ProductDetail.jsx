/**
 * ProductDetail — Shows a product's info, current prices at different stores,
 * and full price history. Users can confirm or deny reported prices.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ImageIcon, Check, X, Clock, Edit2, Trash2, MapPin } from 'lucide-react'
import { useAuth, useUserRole, useProduct, useProductPrices, useProductHistory, useEditProduct, useConfirmPrice, useProductConfirmations } from '../../lib/hooks'
import { timeAgo } from '../../lib/utils'
import { Avatar, BackButton, SectionTitle } from '../../components'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin } = useUserRole()
  const { deleteProduct, isPending: isDeleting } = useEditProduct()

  const animationStyle = {
    animation: 'fadeInUp 0.8s ease-out forwards'
  }

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: product, isLoading: productLoading } = useProduct(id)
  const { data: currentPrices } = useProductPrices(id)
  const { data: priceHistory } = useProductHistory(id)

  const { data: myConfirmations } = useProductConfirmations(user?.id, id)

  const confirmMutation = useConfirmPrice(user?.id, [
    ['product-prices', id],
    ['product-history', id],
    ['product-confirmations', id],
  ])

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleDeleteProduct = async () => {
    if (!window.confirm('Are you sure you want to delete this product? This cannot be undone.')) {
      return
    }

    try {
      await deleteProduct(id)
      navigate('/')
    } catch (err) {
      alert('Failed to delete product: ' + err.message)
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  if (productLoading) return <div className="page"><p>Loading...</p></div>
  if (!product) return <div className="page"><p>Product not found.</p></div>

  return (
    <div className="page opacity-0" style={animationStyle}>
      <BackButton onClick={() => navigate(-1)} />



      <div className="flex flex-col bg-white border border-gray-200 rounded-md shadow-sm mb-5">
        {/* Product info */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-56 w-full rounded-tl-md rounded-tr-md bg-gray-200 object-contain"
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center rounded-md bg-gray-200 text-gray-500">
            <div className="flex flex-col items-center">
              <ImageIcon size={56} />
            </div>
          </div>
        )}
        <div className='flex flex-col px-4 py-5'>
          <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
          {product.brand && <span className="text-sm text-gray-500 font-medium">{product.brand}</span>}
          {product.barcode && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-sm self-start mt-1">{product.barcode}</span>}
        </div>

      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => navigate(`/admin/products`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit2 size={16} />
            Edit Product
          </button>

        </div>
      )}

      {/* Best Price Section */}
      {currentPrices && currentPrices.length > 0 ? (
        <>
          {(() => {
            const bestPrice = currentPrices.filter(p => p.is_available).sort((a, b) => a.price - b.price)[0]
            return bestPrice ? (
              <section className="mb-6">
                <div className="bg-linear-to-r from-green-500 to-green-600 rounded-md px-4 py-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-white mb-2.5">Best Price</h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-6xl font-bold text-white">₱{bestPrice.price.toFixed(2)}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[0.72rem] text-white truncate min-w-0 align-middle">
                    <MapPin size={11} className="shrink-0 text-white" />
                    <p className="text-sm font-medium text-white">
                      {bestPrice.store?.name}</p>
                  </div>
                </div>
              </section>
            ) : null
          })()}
        </>
      ) : (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Current Prices</h3>
          <p className="text-center py-6 text-gray-400 text-sm">No prices reported yet.</p>
        </section>
      )}

      {/* Prices at Other Stores — all prices from all stores with Recent Price Changes layout */}
      {priceHistory && priceHistory.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Prices at Other Stores</SectionTitle>
          <div className="space-y-2">
            {priceHistory.map((entry) => {
              const isMyEntry = entry.user_id === user?.id
              const hasConfirmed = myConfirmations?.[entry.id] === true
              const hasDenied = myConfirmations?.[entry.id] === false

              return (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-md px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={11} className="shrink-0" />
                      <span className="font-medium text-sm">{entry.stores?.name || 'Unknown store'}</span>
                    </div>
                    <p className="text-[0.95rem] font-bold text-blue-500 shrink-0 ml-3">₱{entry.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Avatar src={entry.profiles?.avatar_url} size={13} />
                      <div className="min-w-0">
                        <p className="text-xs font-normal text-gray-900 truncate">{entry.profiles?.display_name || 'Unknown'}</p>
                      </div>
                      <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(entry.created_at)}</span>

                      {(() => {
                        const confirms = entry.confirmations?.filter(c => c.confirmed).length || 0
                        const denies = entry.confirmations?.filter(c => !c.confirmed).length || 0
                        return (
                          <>
                            {confirms > 0 && <span className="flex items-center gap-1 text-green-600"><Check size={11} />{confirms}</span>}
                            {denies > 0 && <span className="flex items-center gap-1 text-red-500"><X size={11} />{denies}</span>}
                          </>
                        )
                      })()}
                    </div>
                    {!isMyEntry && user && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => confirmMutation.mutate({ priceId: entry.id, confirmed: true })}
                          disabled={confirmMutation.isPending || hasConfirmed || hasDenied}
                          className={`p-1.5 rounded-md transition-colors ${hasConfirmed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                            } disabled:opacity-50`}
                          title="Confirm this price"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => confirmMutation.mutate({ priceId: entry.id, confirmed: false })}
                          disabled={confirmMutation.isPending || hasConfirmed || hasDenied}
                          className={`p-1.5 rounded-md transition-colors ${hasDenied
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700'
                            } disabled:opacity-50`}
                          title="Deny this price"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      
    </div>
  )
}
