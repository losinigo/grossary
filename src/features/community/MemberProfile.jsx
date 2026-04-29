/**
 * MemberProfile — Public profile page for a community member.
 * Shows avatar, stats (reputation, followers, following), and follow/unfollow actions.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { TrendingUp, Users, UserPlus, UserMinus, User } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks'
import { BackButton } from '../../components'

export default function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isOwnProfile = user?.id === id

  /* ── Queries ─────────────────────────────────────────────── */

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
      const { data } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle()
      return !!data
    },
    enabled: !!user && !isOwnProfile,
  })

  /* ── Mutations ───────────────────────────────────────────── */

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['is-following', id] })
    queryClient.invalidateQueries({ queryKey: ['member-profile', id] })
  }

  const followMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: id }); if (error) throw error },
    onSuccess: invalidate,
    onError: () => alert('Failed to follow. Please try again.'),
  })

  const unfollowMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id); if (error) throw error },
    onSuccess: invalidate,
    onError: () => alert('Failed to unfollow. Please try again.'),
  })

  /* ── Render ──────────────────────────────────────────────── */

  if (isLoading) return <div className="page"><p>Loading...</p></div>
  if (!profile) return <div className="page"><p>User not found.</p></div>

  const stats = [
    { icon: TrendingUp, label: 'Reputation', value: profile.reputation_score },
    { icon: Users, label: 'Followers', value: profile.followers_count },
    { icon: Users, label: 'Following', value: profile.following_count },
  ]

  return (
    <div className="page">
      <BackButton onClick={() => navigate(-1)} />

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2 pt-8 pb-6">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={28} color="var(--color-gray-400)" />
          </div>
        )}
        <p className="text-lg font-semibold text-gray-900">{profile.display_name || 'User'}</p>
        <p className="text-xs text-gray-500">
          Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </p>

        {/* Follow / Unfollow */}
        {user && !isOwnProfile && (
          <div className="flex justify-center mt-4">
            {isFollowing ? (
              <button className="inline-flex items-center gap-2 px-7 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50" onClick={() => unfollowMutation.mutate()} disabled={unfollowMutation.isPending}>
                <UserMinus size={16} /> {unfollowMutation.isPending ? 'Unfollowing...' : 'Unfollow'}
              </button>
            ) : (
              <button className="inline-flex items-center gap-2 px-7 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity disabled:opacity-50" onClick={() => followMutation.mutate()} disabled={followMutation.isPending}>
                <UserPlus size={16} /> {followMutation.isPending ? 'Following...' : 'Follow'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2.5 mt-2">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1 bg-white border border-gray-200 rounded-md py-4 px-2 shadow-sm">
            <Icon size={18} color="var(--color-primary)" />
            <span className="text-lg font-bold text-gray-900">{value}</span>
            <span className="text-[0.7rem] text-gray-500 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
