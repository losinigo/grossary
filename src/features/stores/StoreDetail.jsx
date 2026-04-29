/**
 * StoreDetail — Shows a store's info and all products with current prices at that store.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { BackButton, ProductCard } from '../../components'

export default function StoreDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: products } = useQuery({
    queryKey: ['store-products', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('current_prices')
        .select('id, product_id, price, is_available, created_at, confirmation_count, contributor_name, contributor_avatar_url')
        .eq('store_id', id)
      if (!data?.length) return []
      const productIds = [...new Set(data.map((p) => p.product_id))]
      const { data: prods } = await supabase.from('products').select('id, name, brand').in('id', productIds)
      const prodMap = Object.fromEntries((prods || []).map((p) => [p.id, p]))
      return data.map((p) => ({ ...p, product: prodMap[p.product_id] }))
    },
    enabled: !!id,
  })

  /* ── Render ──────────────────────────────────────────────── */

  if (storeLoading) return <div className="page"><p>Loading...</p></div>
  if (!store) return <div className="page"><p>Store not found.</p></div>

  return (
    <div className="page">
      <BackButton onClick={() => navigate(-1)} />

      {/* Store info */}
      <div className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-md px-4 py-5 shadow-sm mb-5">
        <h2 className="text-lg font-bold text-gray-900">{store.name}</h2>
        {store.address && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={14} /> {store.address}
          </span>
        )}
      </div>

      {/* Products at this store */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Available Products ({products?.length || 0})</h3>
        {products?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                data={p}
                onClick={() => navigate(`/product/${p.product_id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">No products with prices at this store yet.</p>
        )}
      </section>
    </div>
  )
}
