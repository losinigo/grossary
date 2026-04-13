import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './Forms.css'

export default function ConfirmPrice() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [productSearch, setProductSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [productDisplay, setProductDisplay] = useState('')

  const { data: products } = useQuery({
    queryKey: ['products', productSearch],
    queryFn: async () => {
      if (!productSearch.trim()) return []
      const { data } = await supabase
        .from('products')
        .select('id, name, brand')
        .or(`name.ilike.%${productSearch}%,brand.ilike.%${productSearch}%,barcode.eq.${productSearch}`)
        .limit(10)
      return data || []
    },
    enabled: productSearch.length > 1,
  })

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['current-prices', productId],
    queryFn: async () => {
      const { data } = await supabase
        .from('current_prices')
        .select('id, price, is_available, created_at, confirmation_count, store_id, contributor_name')
        .eq('product_id', productId)
      if (!data?.length) return []
      const storeIds = [...new Set(data.map((p) => p.store_id))]
      const { data: stores } = await supabase.from('stores').select('id, name, address').in('id', storeIds)
      const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s]))
      return data.map((p) => ({ ...p, store: storeMap[p.store_id] }))
    },
    enabled: !!productId,
  })

  const confirm = useMutation({
    mutationFn: async ({ priceId, confirmed }) => {
      const { error } = await supabase.from('confirmations').upsert(
        { price_id: priceId, user_id: user.id, confirmed },
        { onConflict: 'price_id,user_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-prices', productId] })
      queryClient.invalidateQueries({ queryKey: ['my-confirmations-cp', productId] })
    },
  })

  const { data: myConfirmations } = useQuery({
    queryKey: ['my-confirmations-cp', productId],
    queryFn: async () => {
      const { data } = await supabase
        .from('confirmations')
        .select('price_id, confirmed')
        .eq('user_id', user.id)
      if (!data) return {}
      return Object.fromEntries(data.map((c) => [c.price_id, c.confirmed]))
    },
    enabled: !!user && !!productId,
  })

  const timeAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/contribute')}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="page-title">Confirm Price</h2>
      <p className="page-subtitle">Verify that an existing price is still accurate.</p>

      <div className="form">
        <label className="form-label">
          Search Product *
          <input
            className="form-input"
            value={productId ? productDisplay : productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setProductId(''); setProductDisplay('') }}
            placeholder="Search by name, brand, or barcode"
          />
        </label>

        {products?.length > 0 && !productId && (
          <div className="dropdown">
            {products.map((p) => (
              <button key={p.id} type="button" className="dropdown-item" onClick={() => { setProductId(p.id); setProductDisplay(`${p.name}${p.brand ? ` (${p.brand})` : ''}`); setProductSearch('') }}>
                {p.name} {p.brand && <span className="text-muted">— {p.brand}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {productId && pricesLoading && <p className="search-status">Loading prices...</p>}

      {productId && !pricesLoading && prices?.length === 0 && (
        <div className="confirm-empty">
          <p>No prices found for this product.</p>
        </div>
      )}

      {prices?.length > 0 && (
        <div className="confirm-list">
          {prices.map((p) => (
            <div key={p.id} className="confirm-card">
              <div className="confirm-card-header">
                <span className="confirm-price">₱{Number(p.price).toFixed(2)}</span>
                <span className="confirm-time">{timeAgo(p.created_at)}</span>
              </div>
              {p.store && (
                <span className="confirm-store">
                  <MapPin size={13} /> {p.store.name}{p.store.address ? ` — ${p.store.address}` : ''}
                </span>
              )}
              {p.contributor_name && <span className="confirm-contributor">Reported by {p.contributor_name}</span>}
              {p.confirmation_count > 0 && <span className="confirm-count">{p.confirmation_count} confirmation{p.confirmation_count !== 1 ? 's' : ''}</span>}
              <div className="confirm-actions">
                {(() => {
                  const status = myConfirmations?.[p.id]
                  return (
                    <>
                      <button
                        className={`confirm-btn confirm-yes${status === true ? ' confirm-active' : ''}${status === false ? ' confirm-inactive' : ''}`}
                        onClick={() => confirm.mutate({ priceId: p.id, confirmed: true })}
                        disabled={confirm.isPending}
                      >
                        <CheckCircle size={16} /> {status === true ? 'Confirmed' : 'Confirm'}
                      </button>
                      <button
                        className={`confirm-btn confirm-no${status === false ? ' confirm-active' : ''}${status === true ? ' confirm-inactive' : ''}`}
                        onClick={() => confirm.mutate({ priceId: p.id, confirmed: false })}
                        disabled={confirm.isPending}
                      >
                        <XCircle size={16} /> {status === false ? 'Denied' : 'Deny'}
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
