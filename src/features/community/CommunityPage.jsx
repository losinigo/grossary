import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import './CommunityPage.css'

export default function CommunityPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

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
        <div className="community-section-header">
          <Trophy size={16} color="var(--color-orange)" />
          <span className="community-section-title">Top Contributors</span>
        </div>
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
