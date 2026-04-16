import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'

const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400'
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-gray-500'
const dropdownItem = 'block w-full px-3.5 py-2.5 text-left text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors'
const confirmBase = 'inline-flex items-center gap-1.5 flex-1 justify-center py-2 px-3 text-[0.82rem] font-semibold rounded-sm transition-opacity disabled:opacity-50'

export default function ConfirmPrice() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [productSearch, setProductSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [productDisplay, setProductDisplay] = useState('')

  const { data: products } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: async () => { if (!productSearch.trim()) return []; const { data } = await supabase.from('products').select('id, name, brand').or(`name.ilike.%${productSearch}%,brand.ilike.%${productSearch}%,barcode.eq.${productSearch}`).limit(10); return data || [] },
    enabled: productSearch.length > 1,
  })

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['current-prices', productId],
    queryFn: async () => {
      const { data } = await supabase.from('current_prices').select('id, price, is_available, created_at, confirmation_count, store_id, user_id, contributor_name').eq('product_id', productId)
      if (!data?.length) return []
      const storeIds = [...new Set(data.map((p) => p.store_id))]
      const { data: stores } = await supabase.from('stores').select('id, name, address').in('id', storeIds)
      const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s]))
      return data.map((p) => ({ ...p, store: storeMap[p.store_id] }))
    },
    enabled: !!productId,
  })

  const confirmMutation = useMutation({
    mutationFn: async ({ priceId, confirmed }) => { const { error } = await supabase.from('confirmations').upsert({ price_id: priceId, user_id: user.id, confirmed }, { onConflict: 'price_id,user_id' }); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['current-prices', productId] }); queryClient.invalidateQueries({ queryKey: ['my-confirmations-cp', productId] }) },
    onError: () => alert('Failed to submit. Please try again.'),
  })

  const { data: myConfirmations } = useQuery({
    queryKey: ['my-confirmations-cp', productId],
    queryFn: async () => { const { data } = await supabase.from('confirmations').select('price_id, confirmed').eq('user_id', user.id); return data ? Object.fromEntries(data.map((c) => [c.price_id, c.confirmed])) : {} },
    enabled: !!user && !!productId,
  })

  return (
    <div className="page">
      <button className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1" onClick={() => navigate('/contribute')}><ArrowLeft size={18} /> Back</button>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Confirm Price</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Verify that an existing price is still accurate.</p>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <label className={labelCls}>Search Product *
            <input className={inputCls} value={productId ? productDisplay : productSearch} onChange={(e) => { setProductSearch(e.target.value); setProductId(''); setProductDisplay('') }} placeholder="Search by name, brand, or barcode" />
          </label>
          {products?.length > 0 && !productId && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-sm shadow-md overflow-hidden z-100">
              {products.map((p) => (
                <button key={p.id} type="button" className={dropdownItem} onClick={() => { setProductId(p.id); setProductDisplay(`${p.name}${p.brand ? ` (${p.brand})` : ''}`); setProductSearch('') }}>
                  {p.name} {p.brand && <span className="text-gray-500">— {p.brand}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {productId && pricesLoading && <p className="text-center py-10 text-gray-500 text-sm">Loading prices...</p>}
      {productId && !pricesLoading && prices?.length === 0 && <p className="text-center py-10 text-gray-500 text-sm">No prices found for this product.</p>}

      {prices?.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-4">
          {prices.map((p) => (
            <div key={p.id} className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-green">₱{Number(p.price).toFixed(2)}</span>
                <span className="text-xs text-gray-500">{timeAgo(p.created_at)}</span>
              </div>
              {p.store && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><MapPin size={13} /> {p.store.name}{p.store.address ? ` — ${p.store.address}` : ''}</span>}
              {p.contributor_name && <span className="text-xs text-gray-400">Reported by {p.contributor_name}</span>}
              {p.confirmation_count > 0 && <span className="text-xs font-medium text-green">{p.confirmation_count} confirmation{p.confirmation_count !== 1 ? 's' : ''}</span>}
              {user.id !== p.user_id ? (
                <div className="flex gap-2 mt-1">
                  {(() => {
                    const status = myConfirmations?.[p.id]
                    return (
                      <>
                        <button className={`${confirmBase} ${status === true ? 'bg-green-light text-green font-bold shadow-[inset_0_0_0_2px_currentColor]' : status === false ? 'opacity-35 bg-gray-100 text-gray-400' : 'bg-green-light text-green'}`} onClick={() => confirmMutation.mutate({ priceId: p.id, confirmed: true })} disabled={confirmMutation.isPending}>
                          <CheckCircle size={16} /> {status === true ? 'Confirmed' : 'Confirm'}
                        </button>
                        <button className={`${confirmBase} ${status === false ? 'bg-red-light text-red font-bold shadow-[inset_0_0_0_2px_currentColor]' : status === true ? 'opacity-35 bg-gray-100 text-gray-400' : 'bg-red-light text-red'}`} onClick={() => confirmMutation.mutate({ priceId: p.id, confirmed: false })} disabled={confirmMutation.isPending}>
                          <XCircle size={16} /> {status === false ? 'Denied' : 'Deny'}
                        </button>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mt-1">You reported this price</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
