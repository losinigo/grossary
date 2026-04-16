import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'
import './MemberProfile.css'

export default function MemberProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  // Effect to handle URL changes and clear stale cache
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['member-profile'] })
  }, [userId, queryClient])

  // Fetch member profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['member-profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data } = await supabase.rpc('get_user_profile_stats', {
        p_user_id: userId,
      })
      return data?.[0] || null
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  })

  // Check if current user follows this member
  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', currentUser?.id, userId],
    queryFn: async () => {
      if (!currentUser) return false
      const { data } = await supabase.rpc('is_user_following', {
        p_follower_id: currentUser.id,
        p_following_id: userId,
      })
      return data
    },
    enabled: !!currentUser && !!userId,
  })

  const isFollowing = followStatus ?? false

  // Fetch member's recent contributions
  const { data: contributions, isLoading: contributionsLoading } = useQuery({
    queryKey: ['member-contributions', userId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_contributions', {
        p_user_id: userId,
        limit_count: 15,
      })
      return data || []
    },
    enabled: !!userId,
  })

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
      } else {
        // Follow
        await supabase.from('follows').insert([
          {
            follower_id: currentUser.id,
            following_id: userId,
          },
        ])
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status'] })
      queryClient.invalidateQueries({ queryKey: ['member-profile', userId] })
    },
  })

  if (profileLoading) {
    return (
      <div className="page member-profile-page">
        <div className="loading">
          <Loader size={24} className="spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page member-profile-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="empty-state">
          <p>Member not found</p>
        </div>
      </div>
    )
  }

  const canFollow = currentUser && currentUser.id !== userId

  return (
    <div className="page member-profile-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        Back
      </button>

      {/* Profile Header */}
      <div className="profile-header">
        {profile.avatar_url ? (
          <img 
            src={profile.avatar_url} 
            alt="" 
            className="avatar-img" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="avatar">
            <Avatar src={null} size={32} />
          </div>
        )}
        <h2 className="profile-name">{profile.display_name}</h2>
        <p className="profile-joined">
          Joined {new Date(profile.created_at).toLocaleDateString(undefined, {
            month: 'short',
            year: 'numeric',
          })}
        </p>

        {canFollow && (
          <button
            className={`btn-follow ${isFollowing ? 'following' : ''}`}
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
          >
            {followMutation.isPending ? (
              <>
                <Loader size={14} className="spinner" />
              </>
            ) : isFollowing ? (
              'Following ✓'
            ) : (
              'Follow'
            )}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="stat-box">
          <p className="stat-value">{profile.reputation_score}</p>
          <p className="stat-label">Reputation</p>
        </div>
        <div className="stat-box">
          <p className="stat-value">{profile.contributions_count}</p>
          <p className="stat-label">Contributions</p>
        </div>
        <div className="stat-box">
          <p className="stat-value">{profile.followers_count}</p>
          <p className="stat-label">Followers</p>
        </div>
        <div className="stat-box">
          <p className="stat-value">{profile.following_count}</p>
          <p className="stat-label">Following</p>
        </div>
      </div>

      {/* Contributions Section */}
      <div className="contributions-section">
        <h3 className="section-title">Recent Contributions</h3>

        {contributionsLoading ? (
          <div className="loading">
            <Loader size={20} className="spinner" />
          </div>
        ) : contributions && contributions.length > 0 ? (
          <div className="contributions-list">
            {contributions.map((contribution) => (
              <div key={contribution.id} className="contribution-item">
                <div className="contribution-product">
                  <p className="product-name">{contribution.product_name}</p>
                  {contribution.brand && (
                    <p className="product-brand">{contribution.brand}</p>
                  )}
                </div>
                <div className="contribution-details">
                  <p className="contribution-store">{contribution.store_name}</p>
                  <p className="contribution-time">
                    {timeAgo(contribution.created_at)}
                  </p>
                </div>
                <div className="contribution-price">
                  <p className="price">${Number(contribution.price).toFixed(2)}</p>
                  {contribution.confirmation_count > 0 && (
                    <p className="confirmations">
                      ✓ {contribution.confirmation_count}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No contributions yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
