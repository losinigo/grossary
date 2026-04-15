import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Users, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: async ({ priceId, confirmed }) => {
      const { error } = await supabase.from('confirmations').upsert(
        { price_id: priceId, user_id: user.id, confirmed },
        { onConflict: 'price_id,user_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-prices', id] })
      queryClient.invalidateQueries({ queryKey: ['my-confirmations', id] })
    },
    onError: () => alert('Failed to submit. Please try again.'),
  })

  const { data: myConfirmations } = useQuery({
    queryKey: ['my-confirmations', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('confirmations')
        .select('price_id, confirmed')
        .eq('user_id', user.id)
      if (!data) return {}
      return Object.fromEntries(data.map((c) => [c.price_id, c.confirmed]))
    },
    enabled: !!user,
  })

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
      const { data } = await supabase
        .from('current_prices')
        .select('id, price, is_available, created_at, confirmation_count, store_id, user_id, contributor_name, contributor_avatar_url')
        .eq('product_id', id)
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
      const { data } = await supabase
        .from('prices')
        .select('id, price, created_at, is_available, stores(name), profiles:user_id(display_name, avatar_url)')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!id,
  })

  if (productLoading) return <div className="page"><p>Loading...</p></div>
  if (!product) return <div className="page"><p>Product not found.</p></div>

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="product-info-card">
        <h2 className="product-name">{product.name}</h2>
        {product.brand && <span className="product-brand">{product.brand}</span>}
        {product.barcode && <span className="product-barcode">{product.barcode}</span>}
      </div>

      <section className="detail-section">
        <h3 className="detail-section-title">Current Prices</h3>
        {currentPrices?.length > 0 ? (
          <div className="detail-list">
            {currentPrices.map((p) => (
              <div key={p.id} className="detail-card">
                <div className="detail-card-header">
                  <span className="detail-price">₱{Number(p.price).toFixed(2)}</span>
                  <span className="detail-time">{timeAgo(p.created_at)}</span>
                </div>
                {p.store && (
                  <span className="detail-store">
                    <MapPin size={13} /> {p.store.name}{p.store.address ? ` — ${p.store.address}` : ''}
                  </span>
                )}
                <div className="detail-footer">
                  {p.contributor_name && (
                    <span className="detail-meta">
                      <Avatar src={p.contributor_avatar_url} size={18} />
                      {p.contributor_name}
                    </span>
                  )}
                  <span className={`detail-meta${p.confirmation_count > 0 ? ' detail-confirmed' : ''}`}>
                    <Users size={13} /> {p.confirmation_count} confirmed
                  </span>
                </div>
                {p.is_available === false && <span className="detail-unavailable">Marked unavailable</span>}
                {user && user.id !== p.user_id && (
                  <div className="detail-confirm-actions">
                    {(() => {
                      const status = myConfirmations?.[p.id]
                      return (
                        <>
                          <button
                            className={`confirm-btn confirm-yes${status === true ? ' confirm-active' : ''}${status === false ? ' confirm-inactive' : ''}`}
                            onClick={() => confirmMutation.mutate({ priceId: p.id, confirmed: true })}
                            disabled={confirmMutation.isPending}
                          >
                            <CheckCircle size={16} /> {status === true ? 'Confirmed' : 'Confirm'}
                          </button>
                          <button
                            className={`confirm-btn confirm-no${status === false ? ' confirm-active' : ''}${status === true ? ' confirm-inactive' : ''}`}
                            onClick={() => confirmMutation.mutate({ priceId: p.id, confirmed: false })}
                            disabled={confirmMutation.isPending}
                          >
                            <XCircle size={16} /> {status === false ? 'Denied' : 'Deny'}
                          </button>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="detail-empty">No prices reported yet.</p>
        )}
        <button className="btn-primary btn-full" style={{ marginTop: 12 }} onClick={() => navigate('/contribute/price', { state: { productId: product.id, productName: product.name, productBrand: product.brand } })}>
          Update Price
        </button>
      </section>

      <section className="detail-section">
        <h3 className="detail-section-title">Price History</h3>
        {priceHistory?.length > 0 ? (
          <div className="detail-list">
            {priceHistory.map((p) => (
              <div key={p.id} className="history-row">
                <div className="history-left">
                  <Avatar src={p.profiles?.avatar_url} size={18} />
                  <div>
                    <span className="history-contributor">{p.profiles?.display_name || 'Unknown'}</span>
                    <span className="history-store">{p.stores?.name || ''}</span>
                  </div>
                </div>
                <div className="history-right">
                  <span className="history-price">₱{Number(p.price).toFixed(2)}</span>
                  <span className="history-time">
                    <Clock size={11} /> {timeAgo(p.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="detail-empty">No price history yet.</p>
        )}
      </section>
    </div>
  )
}
