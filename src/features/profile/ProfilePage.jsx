import { useNavigate } from 'react-router-dom'
import { User, TrendingUp, CheckCircle, Clock, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import './ProfilePage.css'

export default function ProfilePage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  if (loading) return <div className="page"><p>Loading...</p></div>

  if (!user) {
    return (
      <div className="page">
        <div className="profile-header">
          <div className="avatar">
            <User size={28} color="var(--color-gray-400)" />
          </div>
          <p className="profile-name">Sign in to contribute</p>
          <button className="btn-google" onClick={signInWithGoogle}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" />
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  const meta = user.user_metadata
  const stats = [
    { icon: TrendingUp, label: 'Reputation', value: profile?.reputation_score ?? 0 },
    { icon: CheckCircle, label: 'Member since', value: new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
    { icon: Clock, label: 'Last sign in', value: new Date(user.last_sign_in_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) },
  ]

  return (
    <div className="page">
      <div className="profile-header">
        {meta.avatar_url ? (
          <img src={meta.avatar_url} alt="" className="avatar-img" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar"><User size={28} color="var(--color-gray-400)" /></div>
        )}
        <p className="profile-name">{meta.full_name || meta.name || 'User'}</p>
        <p className="profile-email">{user.email}</p>
      </div>
      <div className="stats-grid">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="stat-card">
            <Icon size={18} color="var(--color-primary)" />
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>
      <button className="contributions-link" onClick={() => navigate('/profile/contributions')}>
        <span>My Contributions</span>
        <ChevronRight size={18} color="var(--color-gray-400)" />
      </button>
      <button className="btn-signout" onClick={signOut}>
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  )
}
