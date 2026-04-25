/**
 * ProductDetail — Shows a product's info, current prices at different stores,
 * and full price history. Users can confirm or deny reported prices.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ImageIcon, Check, X, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import useConfirmPrice from '../../lib/hooks/useConfirmPrice'
import useMyConfirmations from '../../lib/hooks/useMyConfirmations'
import Avatar from '../../components/Avatar'
import BackButton from '../../components/ui/BackButton'
import SectionTitle from '../../components/ui/SectionTitle'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: currentPrices } = useQuery({
    queryKey: ['product-prices', id],
    queryFn: async () => {
      const { data } = await supabase.from('current_prices').select('id, price, is_available, created_at, confirmation_count, store_id, user_id, contributor_name, contributor_avatar_url').eq('product_id', id)
      if (!data?.length) return []
      const storeIds = [...new Set(data.map((p) => p.store_id))]
      const { data: stores } = await supabase.from('stores').select('id, name, address').in('id', storeIds)
      const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s]))
      return data.map((p) => ({ ...p, store: storeMap[p.store_id] }))
    },
    enabled: !!id,
  })

  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', id],
    queryFn: async () => {
      const { data } = await supabase.from('prices').select('id, price, created_at, is_available, stores(name), profiles:user_id(display_name, avatar_url)').eq('product_id', id).order('created_at', { ascending: false }).limit(20)
      return data || []
    },
    enabled: !!id,
  })

  const { data: myConfirmations } = useMyConfirmations(user?.id, id)

  const confirmMutation = useConfirmPrice(user?.id, [
    ['product-prices', id],
    ['my-confirmations', id],
  ])

  /* ── Render ──────────────────────────────────────────────── */

  if (productLoading) return <div className="page"><p>Loading...</p></div>
  if (!product) return <div className="page"><p>Product not found.</p></div>

  return (
    <div className="page">
      <BackButton onClick={() => navigate(-1)} />

      {/* Product info */}
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-56 w-full rounded-md bg-gray-200 object-contain mb-5"
        />
      ) : (
        <div className="flex h-56 w-full items-center justify-center rounded-md bg-gray-200 text-gray-500 mb-5">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon size={56} />
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-md px-4 py-5 shadow-sm mb-5">
        <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
        {product.brand && <span className="text-sm text-gray-500 font-medium">{product.brand}</span>}
        {product.barcode && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-sm self-start mt-1">{product.barcode}</span>}
      </div>

      {/* Best Price Section */}
      {currentPrices && currentPrices.length > 0 ? (
        <>
          {(() => {
            const bestPrice = currentPrices.filter(p => p.is_available).sort((a, b) => a.price - b.price)[0]
            return bestPrice ? (
              <section className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Best Price Available</h3>
                <div className="bg-white border-2 border-green-200 rounded-md px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl font-bold text-green">₱{bestPrice.price.toFixed(2)}</span>
                    <span className="text-xs font-medium text-gray-500">{bestPrice.confirmation_count} confirmations</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{bestPrice.store?.name}</p>
                    <p className="text-xs text-gray-600">{bestPrice.store?.address}</p>
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

      {/* Current Prices at All Stores */}
      {currentPrices && currentPrices.length > 1 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Prices at Other Stores</h3>
          <div className="space-y-2">
            {currentPrices.filter(p => p.is_available).map((price) => {
              const isMyPrice = price.user_id === user?.id
              const hasConfirmed = myConfirmations?.[price.id] === true
              const hasDenied = myConfirmations?.[price.id] === false
              
              return (
                <div key={price.id} className="flex justify-between items-center bg-white border border-gray-200 rounded-md px-4 py-3 shadow-sm">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{price.store?.name}</p>
                    <p className="text-xs text-gray-500">{price.store?.address}</p>
                    {isMyPrice && <p className="text-xs text-blue-600 font-medium mt-1">Added by you</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[0.95rem] font-bold text-green">₱{price.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{price.confirmation_count} confirmations</p>
                    </div>
                    {!isMyPrice && user && (
                      <div className="flex gap-2">
                        {(hasConfirmed || !hasDenied) && (
                          <button
                            onClick={() => confirmMutation.mutate({ priceId: price.id, isConfirmed: true })}
                            disabled={confirmMutation.isPending || hasConfirmed}
                            className={`p-2 rounded-lg transition-colors ${
                              hasConfirmed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            } disabled:opacity-50`}
                            title="Confirm this price"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {(hasDenied || !hasConfirmed) && (
                          <button
                            onClick={() => confirmMutation.mutate({ priceId: price.id, isConfirmed: false })}
                            disabled={confirmMutation.isPending || hasDenied}
                            className={`p-2 rounded-lg transition-colors ${
                              hasDenied
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                            } disabled:opacity-50`}
                            title="Deny this price"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Price History */}
      {priceHistory && priceHistory.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Recent Price Changes</h3>
          <div className="space-y-2">
            {priceHistory.map((entry) => {
              const isMyEntry = entry.user_id === user?.id
              const hasConfirmed = myConfirmations?.[entry.id] === true
              const hasDenied = myConfirmations?.[entry.id] === false
              
              return (
                <div key={entry.id} className="flex justify-between items-center bg-white border border-gray-200 rounded-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar src={entry.profiles?.avatar_url} size={32} />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">{entry.profiles?.display_name || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{entry.stores?.name || ''}</span>
                        {!entry.is_available && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Out of Stock</span>
                        )}
                        {isMyEntry && <span className="text-xs font-medium text-blue-600">Your entry</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[0.95rem] font-bold text-green">₱{entry.price.toFixed(2)}</p>
                      <span className="inline-flex items-center gap-1 text-[0.7rem] text-gray-400"><Clock size={11} /> {timeAgo(entry.created_at)}</span>
                    </div>
                    {!isMyEntry && user && (
                      <div className="flex gap-2">
                        {(hasConfirmed || !hasDenied) && (
                          <button
                            onClick={() => confirmMutation.mutate({ priceId: entry.id, isConfirmed: true })}
                            disabled={confirmMutation.isPending || hasConfirmed}
                            className={`p-2 rounded-lg transition-colors ${
                              hasConfirmed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            } disabled:opacity-50`}
                            title="Confirm this price"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {(hasDenied || !hasConfirmed) && (
                          <button
                            onClick={() => confirmMutation.mutate({ priceId: entry.id, isConfirmed: false })}
                            disabled={confirmMutation.isPending || hasDenied}
                            className={`p-2 rounded-lg transition-colors ${
                              hasDenied
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                            } disabled:opacity-50`}
                            title="Deny this price"
                          >
                            <X size={18} />
                          </button>
                        )}
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
