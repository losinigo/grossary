/**
 * ContributionsPage — Breakdown of the current user's contributions:
 * items added, stores added, prices reported, and prices confirmed.
 */
import { useNavigate } from 'react-router-dom'
import { PackagePlus, StoreIcon, DollarSign, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import BackButton from '../../components/ui/BackButton'

export default function ContributionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['contributions', user?.id],
    queryFn: async () => {
      const [products, stores, prices, confirmations] = await Promise.all([
        supabase.from('products').select('id, name, created_at').eq('created_by', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('stores').select('id, name, created_at').eq('created_by', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('prices').select('id, price, created_at, products(name), stores(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('confirmations').select('id, confirmed, created_at, prices(products(name), stores(name))').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ])
      return {
        products: products.data || [],
        stores: stores.data || [],
        prices: prices.data || [],
        confirmations: confirmations.data || [],
      }
    },
    enabled: !!user,
  })

  /* ── Render ──────────────────────────────────────────────── */

  if (isLoading) return <div className="page"><p>Loading...</p></div>

  const sections = [
    { icon: PackagePlus, title: 'Items Added', count: data?.products.length || 0, items: data?.products.map((p) => ({ primary: p.name, secondary: timeAgo(p.created_at) })) },
    { icon: StoreIcon, title: 'Stores Added', count: data?.stores.length || 0, items: data?.stores.map((s) => ({ primary: s.name, secondary: timeAgo(s.created_at) })) },
    { icon: DollarSign, title: 'Prices Reported', count: data?.prices.length || 0, items: data?.prices.map((p) => ({ primary: `${p.products?.name || 'Unknown'} — ₱${Number(p.price).toFixed(2)}`, secondary: `${p.stores?.name || ''} · ${timeAgo(p.created_at)}` })) },
    { icon: ShieldCheck, title: 'Prices Confirmed', count: data?.confirmations.length || 0, items: data?.confirmations.map((c) => ({ primary: c.prices?.products?.name || 'Unknown', secondary: `${c.prices?.stores?.name || ''} · ${timeAgo(c.created_at)}` })) },
  ]

  return (
    <div className="page">
      <BackButton onClick={() => navigate('/profile')} />
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">My Contributions</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Breakdown of everything you've contributed.</p>

      <div className="flex flex-col gap-4 mt-4">
        {sections.map(({ icon: Icon, title, count, items }) => (
          <div key={title} className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100">
              <Icon size={18} color="var(--color-primary)" />
              <span className="text-sm font-semibold text-gray-900 flex-1">{title}</span>
              <span className="text-xs font-semibold text-primary bg-primary-light px-2.5 py-0.5 rounded-full">{count}</span>
            </div>
            {items?.length > 0 ? (
              <div className="flex flex-col">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-900">{item.primary}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-3">{item.secondary}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-center text-sm text-gray-400">No contributions yet</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
