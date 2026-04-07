import { Outlet } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'
import NavBar from './NavBar'
import './Layout.css'

export default function Layout() {
  const { user } = useAuth()
  const avatar = user?.user_metadata?.avatar_url

  return (
    <div className="layout">
      <header className="header">
        <span className="header-logo">Grossary</span>
        {avatar && <img src={avatar} alt="" className="header-avatar" referrerPolicy="no-referrer" />}
      </header>
      <main className="main">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
