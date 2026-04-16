import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Users, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'

const meta = 'inline-flex items-center gap-1 text-xs text-gray-500'
const confirmBase = 'inline-flex items-center gap-1.5 flex-1 justify-center py-2 px-3 text-[0.82rem] font-semibold rounded-sm transition-opacity disabled:opacity-50'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: async ({ priceId, confirmed }) => {
      const { error } = await supabase.from('confirmations').upsert({ price_id: priceId, user_id: user.id, confirmed }, { onConflict: 'price_id,user_id' })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['product-prices', id] }); queryClient.invalidateQueries({ queryKey: ['my-confirmations', id] }) },
    onError: () => alert('Failed to submit. Please try again.'),
  })

  const { data: myConfirmations } = useQuery({
    queryKey: ['my-confirmations', id],
    queryFn: async () => { const { data } = await supabase.from('confirmations').select('price_id, confirmed').eq('user_id', user.id); return data ? Object.fromEntries(data.map((c) => [c.price_id, c.confirmed])) : {} },
    enabled: !!user,
  })

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await supabase.from('products').select('*').eq('id', id).single(); return data },
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

  if (productLoading) return <div className="page"><p>Loading...</p></div>
  if (!product) return <div className="page"><p>Product not found.</p></div>

  return (
    <div className="page">
      <button className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-md px-4 py-5 shadow-sm mb-5">
        <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
        {product.brand && <span className="text-sm text-gray-500 font-medium">{product.brand}</span>}
        {product.barcode && <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-sm self-start mt-1">{product.barcode}</span>}
      </div>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Current Prices</h3>
        {currentPrices?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {currentPrices.map((p) => (
              <div key={p.id} className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green">₱{Number(p.price).toFixed(2)}</span>
                  <span className="text-xs text-gray-500">{timeAgo(p.created_at)}</span>
                </div>
                {p.store && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><MapPin size={13} /> {p.store.name}{p.store.address ? ` — ${p.store.address}` : ''}</span>}
                <div className="flex items-center gap-3">
                  {p.contributor_name && <span className={meta}><Avatar src={p.contributor_avatar_url} size={18} />{p.contributor_name}</span>}
                  <span className={`${meta} ${p.confirmation_count > 0 ? '!text-green !font-medium' : ''}`}><Users size={13} /> {p.confirmation_count} confirmed</span>
                </div>
                {p.is_available === false && <span className="inline-block text-xs font-medium text-red bg-red-light px-2 py-0.5 rounded-full self-start">Marked unavailable</span>}
                {user && user.id !== p.user_id && (() => {
                  const status = myConfirmations?.[p.id]
                  return (
                    <div className="flex gap-2 mt-1">
                      <button className={`${confirmBase} ${status === true ? 'bg-green-light text-green font-bold shadow-[inset_0_0_0_2px_currentColor]' : status === false ? 'opacity-35 bg-gray-100 text-gray-400' : 'bg-green-light text-green'}`} onClick={() => confirmMutation.mutate({ priceId: p.id, confirmed: true })} disabled={confirmMutation.isPending}>
                        <CheckCircle size={16} /> {status === true ? 'Confirmed' : 'Confirm'}
                      </button>
                      <button className={`${confirmBase} ${status === false ? 'bg-red-light text-red font-bold shadow-[inset_0_0_0_2px_currentColor]' : status === true ? 'opacity-35 bg-gray-100 text-gray-400' : 'bg-red-light text-red'}`} onClick={() => confirmMutation.mutate({ priceId: p.id, confirmed: false })} disabled={confirmMutation.isPending}>
                        <XCircle size={16} /> {status === false ? 'Denied' : 'Deny'}
                      </button>
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">No prices reported yet.</p>
        )}
        <button className="w-full mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity" onClick={() => navigate('/contribute/price', { state: { productId: product.id, productName: product.name, productBrand: product.brand } })}>
          Update Price
        </button>
      </section>

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
