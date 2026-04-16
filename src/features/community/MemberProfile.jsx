import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Users, UserPlus, UserMinus, User } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './MemberProfile.css'

export default function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isOwnProfile = user?.id === id

  const { data: profile, isLoading } = useQuery({
    queryKey: ['member-profile', id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_profile_stats', { p_user_id: id })
      return data?.[0] || null
    },
    enabled: !!id,
  })

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .maybeSingle()
      return !!data
    },
    enabled: !!user && !isOwnProfile,
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', id] })
      queryClient.invalidateQueries({ queryKey: ['member-profile', id] })
    },
    onError: () => alert('Failed to follow. Please try again.'),
  })

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', id] })
      queryClient.invalidateQueries({ queryKey: ['member-profile', id] })
    },
    onError: () => alert('Failed to unfollow. Please try again.'),
  })

  if (isLoading) return <div className="page"><p>Loading...</p></div>
  if (!profile) return <div className="page"><p>User not found.</p></div>

  const stats = [
    { icon: TrendingUp, label: 'Reputation', value: profile.reputation_score },
    { icon: Users, label: 'Followers', value: profile.followers_count },
    { icon: Users, label: 'Following', value: profile.following_count },
  ]

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="profile-header">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="avatar-img" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar"><User size={28} color="var(--color-gray-400)" /></div>
        )}
        <p className="profile-name">{profile.display_name || 'User'}</p>
        <p className="profile-email">
          Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </p>
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

      {user && !isOwnProfile && (
        <div className="member-actions">
          {isFollowing ? (
            <button
              className="btn-unfollow"
              onClick={() => unfollowMutation.mutate()}
              disabled={unfollowMutation.isPending}
            >
              <UserMinus size={16} />
              {unfollowMutation.isPending ? 'Unfollowing...' : 'Unfollow'}
            </button>
          ) : (
            <button
              className="btn-follow"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              <UserPlus size={16} />
              {followMutation.isPending ? 'Following...' : 'Follow'}
            </button>
          )}
        </div>
      )}

      {isOwnProfile && (
        <p className="own-profile-hint">This is your profile.</p>
      )}
    </div>
  )
}
