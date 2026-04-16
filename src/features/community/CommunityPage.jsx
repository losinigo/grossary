import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'
import './CommunityPage.css'

export default function CommunityPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [mode, setMode] = useState('feed') // 'feed' or 'search'

  // Fetch user's feed (contributions from followed users)
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['user-feed', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase.rpc('get_user_feed', {
        p_user_id: user.id,
        limit_count: 30,
      })
      return data || []
    },
    enabled: mode === 'feed' && !!user,
  })

  // Search members
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-members', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      const { data } = await supabase.rpc('search_members', {
        search_term: searchQuery,
        limit_count: 20,
      })
      return data || []
    },
    enabled: mode === 'search' && searchQuery.length > 0,
  })

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value.trim().length > 0) {
      setMode('search')
    }
  }

  const handleViewProfile = (memberId) => {
    navigate(`/members/${memberId}`)
  }

  const handleModeClear = () => {
    setSearchQuery('')
    setMode('feed')
  }

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <p className="empty-title">Connect with the community</p>
          <p className="empty-subtitle">Sign in to follow other members and see their contributions.</p>
          <button className="btn-primary" onClick={() => navigate('/profile')}>Sign In</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="page-title">Community</h2>
      <p className="page-subtitle">Follow members and see their contributions.</p>

      {/* Search Bar */}
      <div className="search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={handleModeClear}>✕</button>
        )}
      </div>

      {/* Search Results */}
      {mode === 'search' && (
        <div className="community-section">
          <h3 className="section-title">Members Found</h3>
          {searchLoading && (
            <div className="loading">
              <Loader size={24} className="spinner" />
              <p>Searching...</p>
            </div>
          )}
          {!searchLoading && searchResults?.length === 0 && (
            <div className="empty-result">
              <p>No members found matching "{searchQuery}"</p>
            </div>
          )}
          {!searchLoading && searchResults && searchResults.length > 0 && (
            <div className="members-list">
              {searchResults.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      {mode === 'feed' && (
        <div className="community-section">
          <h3 className="section-title">Activity Feed</h3>
          {!user ? (
            <div className="empty-result">
              <p>Follow members to see their contributions here</p>
            </div>
          ) : feedLoading ? (
            <div className="loading">
              <Loader size={24} className="spinner" />
              <p>Loading feed...</p>
            </div>
          ) : feedData && feedData.length > 0 ? (
            <div className="feed-list">
              {feedData.map((activity) => (
                <FeedItem
                  key={activity.id}
                  activity={activity}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          ) : (
            <div className="empty-result">
              <p>No activity yet. Search for members to follow</p>
              <button className="btn-text" onClick={() => setMode('search')}>
                Browse Members
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MemberCard({ member, onViewProfile }) {
  return (
    <button
      className="member-card"
      onClick={() => onViewProfile(member.id)}
    >
      <div className="member-header">
        <Avatar src={member.avatar_url} size={36} />
        <div className="member-info">
          <p className="member-name">{member.display_name}</p>
          <p className="member-reputation">⭐ {member.reputation_score} · {member.followers_count} followers</p>
        </div>
      </div>
      <div className="member-stats">
        <span className="stat">
          <strong>{member.following_count}</strong> following
        </span>
      </div>
    </button>
  )
}

function FeedItem({ activity, onViewProfile }) {
  return (
    <button
      className="feed-item"
      onClick={() => onViewProfile(activity.user_id)}
    >
      <div className="feed-avatar">
        <Avatar src={activity.avatar_url} />
      </div>
      <div className="feed-content">
        <div className="feed-header">
          <p className="feed-user">{activity.display_name}</p>
          <p className="feed-time">{timeAgo(activity.created_at)}</p>
        </div>
        <p className="feed-action">
          added <strong>{activity.product_name}</strong>
          {activity.brand && <span className="feed-brand"> ({activity.brand})</span>}
        </p>
        <div className="feed-details">
          <span className="feed-price">₱{Number(activity.price).toFixed(2)}</span>
          <span className="feed-store">{activity.store_name}</span>
        </div>
      </div>
    </button>
  )
}
