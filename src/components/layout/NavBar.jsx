/**
 * NavBar — Fixed bottom tab bar with navigation tabs:
 * Search, Add, Lists, Community, Profile, and Admin (if admin).
 */
import { NavLink } from 'react-router-dom'
import { Search, PlusCircle, Users, User, ShoppingCart, Settings } from 'lucide-react'
import { useUserRole } from '../../lib/hooks'

const baseTabs = [
  { to: '/', label: 'Search', icon: Search },
  { to: '/contribute', label: 'Add', icon: PlusCircle },
  { to: '/lists', label: 'Lists', icon: ShoppingCart },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
]

const adminTab = { to: '/admin/products', label: 'Admin', icon: Settings }

export default function NavBar() {
  const { isAdmin, isLoading } = useUserRole()

  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs

  if (isLoading) return null
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex bg-white/92 backdrop-blur-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom,8px)] pt-1.5 z-100">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-400'}`
          }
          end={to === '/'}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="text-[0.65rem] font-medium tracking-wide">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
