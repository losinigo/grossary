import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trophy, MapPin, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'
import './CommunityPage.css'

export default function CommunityPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['user-search', searchTerm],
    queryFn: async () => {
      const { data } = await supabase.rpc('search_members', { search_term: searchTerm })
      return data || []
    },
    enabled: searchTerm.length > 1,
  })

  const { data: topContributors } = useQuery({
    queryKey: ['top-contributors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, reputation_score, followers_count, following_count')
        .order('reputation_score', { ascending: false })
        .limit(20)
      return data || []
    },
  })

  const { data: feed } = useQuery({
    queryKey: ['community-feed', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_feed', { p_user_id: user.id, limit_count: 20 })
      return data || []
    },
    enabled: !!user,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchTerm(query.trim())
  }

  const list = searchTerm.length > 1 ? searchResults : topContributors
  const isSearching = searchTerm.length > 1

  return (
    <div className="page">
      <h2 className="page-title">Community</h2>
      <p className="page-subtitle">Discover contributors in your area.</p>

      <form className="community-search-bar" onSubmit={handleSearch}>
        <Search size={18} color="var(--color-gray-400)" />
        <input
          className="community-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim().length > 1) setSearchTerm(e.target.value.trim())
            if (e.target.value === '') setSearchTerm('')
          }}
          placeholder="Search contributors..."
        />
      </form>

      {!isSearching && (
        <>
          {user && feed?.length > 0 && (
            <>
              <div className="community-section-header">
                <Clock size={16} color="var(--color-primary)" />
                <span className="community-section-title">Following Activity</span>
              </div>
              <div className="feed-list">
                {feed.map((item) => (
                  <div key={item.id} className="feed-card" onClick={() => navigate(`/product/${item.product_id}`)}>
                    <div className="feed-card-left" onClick={(e) => { e.stopPropagation(); navigate(`/users/${item.user_id}`) }}>
                      <Avatar src={item.avatar_url} size={32} />
                    </div>
                    <div className="feed-card-content">
                      <span className="feed-user" onClick={(e) => { e.stopPropagation(); navigate(`/users/${item.user_id}`) }}>
                        {item.display_name}
                      </span>
                      <span className="feed-text">
                        reported <strong>₱{Number(item.price).toFixed(2)}</strong> for {item.product_name}{item.brand ? ` (${item.brand})` : ''}
                      </span>
                      <div className="feed-meta">
                        <span className="feed-meta-item"><MapPin size={11} /> {item.store_name}</span>
                        <span className="feed-meta-item"><Clock size={11} /> {timeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </>
      )}

      {searching && <p className="loading-text">Searching...</p>}

      {isSearching && !searching && searchResults?.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No users found</p>
          <p className="empty-subtitle">Try a different name.</p>
        </div>
      )}



      {list?.length > 0 && (
        <div className="contributor-list">
          {!isSearching && (<div className="community-section-header">
            <Trophy size={16} color="var(--color-orange)" />
            <span className="community-section-title">Top Contributors</span>
          </div>)}
          {list.map((user, i) => (
            <div key={user.id} className="contributor-card" onClick={() => navigate(`/users/${user.id}`)}>
              {!isSearching && <span className="contributor-rank">#{i + 1}</span>}
              <Avatar src={user.avatar_url} size={40} />
              <div className="contributor-info">
                <span className="contributor-name">{user.display_name || 'User'}</span>
                <span className="contributor-meta">
                  {user.reputation_score} rep · {user.followers_count} followers
                </span>
              </div>
              <div className="contributor-score">
                <span className="score-value">{user.reputation_score}</span>
                <span className="score-label">rep</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
