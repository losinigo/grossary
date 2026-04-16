import { NavLink } from 'react-router-dom'
import { Search, PlusCircle, Users, User, ShoppingCart } from 'lucide-react'
import './NavBar.css'

const tabs = [
  { to: '/', label: 'Search', icon: Search },
  { to: '/contribute', label: 'Add', icon: PlusCircle },
  { to: '/lists', label: 'Lists', icon: ShoppingCart },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function NavBar() {
  return (
    <nav className="navbar">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          end={to === '/'}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
