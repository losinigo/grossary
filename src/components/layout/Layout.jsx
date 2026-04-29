/**
 * Layout — App shell that wraps every page.
 * Provides a sticky header with the app name and user avatar,
 * a scrollable content area (<Outlet />), and the bottom NavBar.
 */
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/hooks'
import { NavBar } from '../index'

export default function Layout() {
  const { user } = useAuth()
  const avatar = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 flex items-center justify-between bg-white px-5 py-3.5 border-b border-gray-200 z-100">
        <span className="text-xl font-bold tracking-tight text-gray-900">Grossary</span>
        {avatar && <img src={avatar} alt="" className="w-7.5 h-7.5 rounded-full object-cover" referrerPolicy="no-referrer" />}
      </header>
      <main className="flex-1 p-4 pb-22">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
