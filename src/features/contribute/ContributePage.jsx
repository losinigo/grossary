import { useNavigate, useLocation } from 'react-router-dom'
import { PackagePlus, DollarSign, ShieldCheck, StoreIcon, LogIn } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'

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
        <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
          <LogIn size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="text-base font-semibold text-gray-900 mt-2">Sign in to contribute</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Help your community by sharing grocery prices and availability.</p>
          <button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity" onClick={signInWithGoogle}>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Contribute</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Help your community by sharing grocery prices.</p>

      {success && (
        <div className="bg-green-light text-[#1a7d36] px-3.5 py-2.5 rounded-sm text-sm font-medium mb-4">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {actions.map(({ icon: Icon, label, desc, path }) => (
          <button
            key={label}
            className="flex items-center gap-3.5 bg-white border border-gray-200 rounded-md px-4 py-3.5 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            onClick={() => navigate(path)}
          >
            <div className="flex items-center justify-center w-[42px] h-[42px] rounded-sm bg-primary-light text-primary shrink-0">
              <Icon size={22} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.95rem] font-semibold">{label}</span>
              <span className="text-xs text-gray-500">{desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
