import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'

export default function StoreDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

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

  if (storeLoading) return <div className="page"><p>Loading...</p></div>
  if (!store) return <div className="page"><p>Store not found.</p></div>

  return (
    <div className="page">
      <button className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-md px-4 py-5 shadow-sm mb-5">
        <h2 className="text-lg font-bold text-gray-900">{store.name}</h2>
        {store.address && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={14} /> {store.address}
          </span>
        )}
      </div>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Available Products ({products?.length || 0})</h3>
        {products?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/product/${p.product_id}`)}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[0.95rem] font-semibold block text-gray-900">{p.product?.name || 'Unknown'}</span>
                    {p.product?.brand && <span className="text-xs text-gray-500">{p.product.brand}</span>}
                  </div>
                  <span className="text-lg font-bold text-green whitespace-nowrap">₱{Number(p.price).toFixed(2)}</span>
                </div>
                <div className="flex items-center flex-wrap gap-3">
                  {p.contributor_name && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Avatar src={p.contributor_avatar_url} size={18} />
                      {p.contributor_name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} /> {timeAgo(p.created_at)}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs ${p.confirmation_count > 0 ? 'text-green font-medium' : 'text-gray-500'}`}>
                    <Users size={12} /> {p.confirmation_count} confirmed
                  </span>
                </div>
                {p.is_available === false && (
                  <span className="inline-block text-xs font-medium text-red bg-red-light px-2 py-0.5 rounded-full self-start">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">No products with prices at this store yet.</p>
        )}
      </section>
    </div>
  )
}
