/**
 * ProfilePage — Shows the current user's profile, stats, and sign-out option.
 * Displays a sign-in prompt for unauthenticated users.
 */
import { useNavigate } from 'react-router-dom'
import { User, TrendingUp, CheckCircle, Clock, LogOut } from 'lucide-react'
import { useAuth } from '../../lib/hooks'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function ProfilePage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data
    },
    enabled: !!user,
  })

  /* ── Render ──────────────────────────────────────────────── */

  if (loading) return <div className="page"><p>Loading...</p></div>

  if (!user) {
    return (
      <div className="page">
        <div className="flex flex-col items-center gap-2 pt-8 pb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={28} color="var(--color-gray-400)" />
          </div>
          <p className="text-lg font-semibold text-gray-900">Sign in to contribute</p>
          <button className="flex items-center gap-2.5 mt-2 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow" onClick={signInWithGoogle}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" />
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  const meta = user.user_metadata
  const stats = [
    { icon: TrendingUp, label: 'Reputation', value: profile?.reputation_score ?? 0, link: '/profile/contributions' },
    { icon: CheckCircle, label: 'Member since', value: new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
    { icon: Clock, label: 'Last sign in', value: new Date(user.last_sign_in_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) },
  ]

  return (
    <div className="page">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2 pt-8 pb-6">
        {meta.avatar_url ? (
          <img src={meta.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={28} color="var(--color-gray-400)" />
          </div>
        )}
        <p className="text-lg font-semibold text-gray-900">{meta.full_name || meta.name || 'User'}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2.5 mt-2">
        {stats.map(({ icon: Icon, label, value, link }) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 bg-white border border-gray-200 rounded-md py-4 px-2 shadow-sm ${link ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
            onClick={link ? () => navigate(link) : undefined}
          >
            <Icon size={18} color="var(--color-primary)" />
            <span className="text-lg font-bold text-gray-900">{value}</span>
            <span className="text-[0.7rem] text-gray-500 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <button className="flex items-center justify-center gap-2 w-full mt-3 py-3 text-red text-sm font-medium rounded-md hover:bg-red-light transition-colors" onClick={signOut}>
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  )
}
