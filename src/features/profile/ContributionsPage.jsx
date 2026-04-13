import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PackagePlus, StoreIcon, DollarSign, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './ContributionsPage.css'

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

  const timeAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  if (isLoading) return <div className="page"><p>Loading...</p></div>

  const sections = [
    {
      icon: PackagePlus,
      title: 'Items Added',
      count: data?.products.length || 0,
      items: data?.products.map((p) => ({ primary: p.name, secondary: timeAgo(p.created_at) })),
    },
    {
      icon: StoreIcon,
      title: 'Stores Added',
      count: data?.stores.length || 0,
      items: data?.stores.map((s) => ({ primary: s.name, secondary: timeAgo(s.created_at) })),
    },
    {
      icon: DollarSign,
      title: 'Prices Reported',
      count: data?.prices.length || 0,
      items: data?.prices.map((p) => ({
        primary: `${p.products?.name || 'Unknown'} — ₱${Number(p.price).toFixed(2)}`,
        secondary: `${p.stores?.name || ''} · ${timeAgo(p.created_at)}`,
      })),
    },
    {
      icon: ShieldCheck,
      title: 'Prices Confirmed',
      count: data?.confirmations.length || 0,
      items: data?.confirmations.map((c) => ({
        primary: c.prices?.products?.name || 'Unknown',
        secondary: `${c.prices?.stores?.name || ''} · ${timeAgo(c.created_at)}`,
      })),
    },
  ]

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/profile')}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="page-title">My Contributions</h2>
      <p className="page-subtitle">Breakdown of everything you've contributed.</p>

      <div className="contrib-sections">
        {sections.map(({ icon: Icon, title, count, items }) => (
          <div key={title} className="contrib-section">
            <div className="contrib-section-header">
              <Icon size={18} color="var(--color-primary)" />
              <span className="contrib-section-title">{title}</span>
              <span className="contrib-section-count">{count}</span>
            </div>
            {items?.length > 0 ? (
              <div className="contrib-list">
                {items.map((item, i) => (
                  <div key={i} className="contrib-item">
                    <span className="contrib-item-primary">{item.primary}</span>
                    <span className="contrib-item-secondary">{item.secondary}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="contrib-empty">No contributions yet</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
