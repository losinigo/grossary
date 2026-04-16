import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trophy, MapPin, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'

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
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Community</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Discover contributors in your area.</p>

      <form className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2.5 shadow-sm mb-5" onSubmit={handleSearch}>
        <Search size={18} color="var(--color-gray-400)" />
        <input
          className="flex-1 border-none outline-none text-[0.95rem] bg-transparent text-gray-900 placeholder:text-gray-400"
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
              <div className="flex items-center gap-1.5 mb-3">
                <Clock size={16} color="var(--color-primary)" />
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Following Activity</span>
              </div>
              <div className="flex flex-col gap-2 mb-6">
                {feed.map((item) => (
                  <div key={item.id} className="flex gap-2.5 bg-white border border-gray-200 rounded-md px-3.5 py-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/product/${item.product_id}`)}>
                    <div className="shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/users/${item.user_id}`) }}>
                      <Avatar src={item.avatar_url} size={32} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-primary cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/users/${item.user_id}`) }}>
                        {item.display_name}
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">
                        reported <strong className="text-green font-bold">₱{Number(item.price).toFixed(2)}</strong> for <strong className="text-gray-900 font-medium">{item.product_name}</strong>{item.brand ? <span className="text-gray-500 font-normal"> ({item.brand})</span> : ''}
                      </span>
                      <div className="flex items-center gap-2.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[0.72rem] text-gray-400"><MapPin size={11} /> {item.store_name}</span>
                        <span className="inline-flex items-center gap-1 text-[0.72rem] text-gray-400"><Clock size={11} /> {timeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {searching && <p className="text-center py-10 text-gray-500 text-sm">Searching...</p>}

      {isSearching && !searching && searchResults?.length === 0 && (
        <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
          <p className="text-base font-semibold text-gray-900 mt-2">No users found</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Try a different name.</p>
        </div>
      )}

      {list?.length > 0 && (
        <div className="flex flex-col gap-2">
          {!isSearching && (
            <div className="flex items-center gap-1.5 mb-3">
              <Trophy size={16} color="var(--color-orange)" />
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Top Contributors</span>
            </div>
          )}
          {list.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/users/${u.id}`)}>
              {!isSearching && <span className="text-xs font-bold text-orange min-w-6 text-center">#{i + 1}</span>}
              <Avatar src={u.avatar_url} size={40} />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[0.95rem] font-semibold text-gray-900 truncate">{u.display_name || 'User'}</span>
                <span className="text-xs text-gray-500">{u.reputation_score} rep · {u.followers_count} followers</span>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className="text-base font-bold text-primary">{u.reputation_score}</span>
                <span className="text-[0.65rem] text-gray-500 font-medium">rep</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
