import { useNavigate, useLocation } from 'react-router-dom'
import { PackagePlus, DollarSign, ShieldCheck, StoreIcon, LogIn } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import './ContributePage.css'

const actions = [
  { icon: PackagePlus, label: 'Add New Item', desc: 'Scan or enter a new grocery product', path: '/contribute/item' },
  { icon: DollarSign, label: 'Update Price', desc: 'Report a price you saw in store', path: '/contribute/price' },
  { icon: ShieldCheck, label: 'Confirm Price', desc: 'Verify an existing price is still accurate', path: '/contribute/confirm' },
  { icon: StoreIcon, label: 'Add Store', desc: 'Add a grocery store not yet listed', path: '/contribute/store' },
]

export default function ContributePage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const success = location.state?.success

  if (loading) return <div className="page"><p>Loading...</p></div>

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <LogIn size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="empty-title">Sign in to contribute</p>
          <p className="empty-subtitle">Help your community by sharing grocery prices and availability.</p>
          <button className="btn-primary" onClick={signInWithGoogle}>Sign in with Google</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="page-title">Contribute</h2>
      <p className="page-subtitle">Help your community by sharing grocery prices.</p>
      {success && <div className="success-toast">{success}</div>}
      <div className="action-list">
        {actions.map(({ icon: Icon, label, desc, path }) => (
          <button key={label} className="action-card" onClick={() => navigate(path)}>
            <div className="action-icon">
              <Icon size={22} />
            </div>
            <div className="action-text">
              <span className="action-label">{label}</span>
              <span className="action-desc">{desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
