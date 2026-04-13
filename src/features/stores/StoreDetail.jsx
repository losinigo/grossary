import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, User, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import './StoreDetail.css'

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

  const timeAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  if (storeLoading) return <div className="page"><p>Loading...</p></div>
  if (!store) return <div className="page"><p>Store not found.</p></div>

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="store-info-card">
        <h2 className="store-detail-name">{store.name}</h2>
        {store.address && (
          <span className="store-detail-address"><MapPin size={14} /> {store.address}</span>
        )}
      </div>

      <section className="store-detail-section">
        <h3 className="store-detail-section-title">Available Products ({products?.length || 0})</h3>
        {products?.length > 0 ? (
          <div className="store-product-list">
            {products.map((p) => (
              <div key={p.id} className="store-product-card" onClick={() => navigate(`/product/${p.product_id}`)}>
                <div className="store-product-header">
                  <div>
                    <span className="store-product-name">{p.product?.name || 'Unknown'}</span>
                    {p.product?.brand && <span className="store-product-brand">{p.product.brand}</span>}
                  </div>
                  <span className="store-product-price">₱{Number(p.price).toFixed(2)}</span>
                </div>
                <div className="store-product-footer">
                  {p.contributor_name && (
                    <span className="store-product-meta">
                      {p.contributor_avatar_url ? (
                        <img src={p.contributor_avatar_url} alt="" className="store-product-avatar" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="store-product-avatar-fallback"><User size={10} /></div>
                      )}
                      {p.contributor_name}
                    </span>
                  )}
                  <span className="store-product-meta">
                    <Clock size={12} /> {timeAgo(p.created_at)}
                  </span>
                  <span className={`store-product-meta${p.confirmation_count > 0 ? ' store-product-confirmed' : ''}`}>
                    <Users size={12} /> {p.confirmation_count} confirmed
                  </span>
                </div>
                {p.is_available === false && <span className="store-product-unavailable">Unavailable</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="store-detail-empty">No products with prices at this store yet.</p>
        )}
      </section>
    </div>
  )
}
