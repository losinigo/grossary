/**
 * ProductDetail — Shows a product's info, current prices at different stores,
 * and full price history. Users can confirm or deny reported prices.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import useConfirmPrice from '../../lib/hooks/useConfirmPrice'
import useMyConfirmations from '../../lib/hooks/useMyConfirmations'
import Avatar from '../../components/Avatar'
import BackButton from '../../components/ui/BackButton'
import PriceCard from '../../components/ui/PriceCard'

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
      <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-md px-4 py-5 shadow-sm mb-5">
        <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
        {product.brand && <span className="text-sm text-gray-500 font-medium">{product.brand}</span>}
        {product.barcode && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-sm self-start mt-1">{product.barcode}</span>}
      </div>

      {/* Current prices */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Current Prices</h3>
        {currentPrices?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {currentPrices.map((p) => (
              <PriceCard
                key={p.id}
                price={p}
                myConfirmations={myConfirmations}
                currentUserId={user?.id}
                onConfirm={confirmMutation.mutate}
                onDeny={confirmMutation.mutate}
                isPending={confirmMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">No prices reported yet.</p>
        )}
        <button className="w-full mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity" onClick={() => navigate('/contribute/price', { state: { productId: product.id, productName: product.name, productBrand: product.brand } })}>
          Update Price
        </button>
      </section>

      {/* Price history */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Price History</h3>
        {priceHistory?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {priceHistory.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-white border border-gray-200 rounded-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Avatar src={p.profiles?.avatar_url} size={18} />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">{p.profiles?.display_name || 'Unknown'}</span>
                    <span className="block text-xs text-gray-500">{p.stores?.name || ''}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[0.95rem] font-bold text-green">₱{Number(p.price).toFixed(2)}</span>
                  <span className="inline-flex items-center gap-1 text-[0.7rem] text-gray-400"><Clock size={11} /> {timeAgo(p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">No price history yet.</p>
        )}
      </section>
    </div>
  )
}
