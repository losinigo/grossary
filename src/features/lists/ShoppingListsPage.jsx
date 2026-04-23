/**
 * ShoppingListsPage — Displays the user's shopping lists with progress bars,
 * estimated totals, and a modal to create new lists.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, Trash2, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import EmptyState from '../../components/ui/EmptyState'

const inputCls = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400 mb-3'

export default function ShoppingListsPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [creating, setCreating] = useState(false)

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: lists, isLoading } = useQuery({
    queryKey: ['shopping-lists', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_shopping_lists', { user_uuid: user.id })
      if (data?.length > 0) {
        return await Promise.all(data.map(async (list) => {
          const { data: summary } = await supabase.rpc('get_shopping_list_summary', { list_uuid: list.id })
          return { ...list, estimated_total: summary?.[0]?.estimated_total || null, items_with_prices: summary?.[0]?.items_with_prices || 0 }
        }))
      }
      return data || []
    },
    enabled: !!user,
  })

  /* ── Mutations ───────────────────────────────────────────── */

  const createList = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data, error } = await supabase.from('shopping_lists').insert({ name, description, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (newList) => { queryClient.invalidateQueries({ queryKey: ['shopping-lists', user.id] }); setShowCreateForm(false); setNewListName(''); setNewListDescription(''); navigate(`/lists/${newList.id}`) },
    onError: () => alert('Failed to create list. Please try again.'),
  })

  const deleteList = useMutation({
    mutationFn: async (listId) => { const { error } = await supabase.from('shopping_lists').delete().eq('id', listId); if (error) throw error },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-lists', user.id] }),
    onError: () => alert('Failed to delete list. Please try again.'),
  })

  /* ── Handlers ────────────────────────────────────────────── */

  const handleCreateList = async (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setCreating(true)
    try { await createList.mutateAsync({ name: newListName.trim(), description: newListDescription.trim() || null }) } finally { setCreating(false) }
  }

  const handleDeleteList = (e, listId) => {
    e.stopPropagation()
    if (confirm('Delete this shopping list?')) deleteList.mutate(listId)
  }

  /* ── Render ──────────────────────────────────────────────── */

  if (authLoading) return <div className="page"><p>Loading...</p></div>

  if (!user) {
    return (
      <div className="page">
        <EmptyState
          icon={<ShoppingCart size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="Sign in to create shopping lists"
          message="Keep track of what you need to buy and compare prices."
          action={<button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full" onClick={signInWithGoogle}>Sign in with Google</button>}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Shopping Lists</h2>
      </div>

      {/* Create list modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5">
          <form className="bg-white rounded-lg p-6 w-full max-w-[400px] shadow-lg" onSubmit={handleCreateList}>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">New Shopping List</h3>
            <input className={inputCls} value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="List name (e.g. Weekly Groceries)" autoFocus />
            <input className={inputCls} value={newListDescription} onChange={(e) => setNewListDescription(e.target.value)} placeholder="Description (optional)" />
            <div className="flex gap-3 mt-5">
              <button type="button" className="flex-1 justify-center py-2.5 px-5 bg-gray-100 text-gray-700 text-sm font-medium rounded-sm hover:bg-gray-200 transition-colors" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="flex-1 justify-center py-2.5 px-5 bg-primary text-white text-sm font-semibold rounded-sm hover:opacity-88 transition-opacity disabled:opacity-50" disabled={creating || !newListName.trim()}>{creating ? 'Creating...' : 'Create List'}</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="text-center py-10 text-gray-500 text-sm">Loading your lists...</p>}

      {!isLoading && lists?.length === 0 && (
        <EmptyState
          icon={<ShoppingCart size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="No shopping lists yet"
          message="Create your first list to start organizing your grocery shopping."
          action={
            <button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full" onClick={() => setShowCreateForm(true)}>
              <Plus size={18} /> Create Your First List
            </button>
          }
        />
      )}

      {lists?.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-primary transition-all" onClick={() => navigate(`/lists/${list.id}`)}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{list.name}</h3>
                  {list.description && <p className="text-sm text-gray-500 leading-relaxed truncate">{list.description}</p>}
                </div>
                <button className="flex items-center justify-center w-8 h-8 rounded-sm text-gray-400 hover:bg-red-light hover:text-red transition-all shrink-0 ml-3 disabled:opacity-50" onClick={(e) => handleDeleteList(e, list.id)} disabled={deleteList.isPending}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <ShoppingCart size={14} /><span>{list.total_items} items</span>
                </div>
                {list.estimated_total && (
                  <div className="flex flex-col gap-0.5 my-2">
                    <span className="text-sm font-semibold text-green">₱{Number(list.estimated_total).toFixed(2)} estimated</span>
                    <span className="text-xs text-gray-500">{list.items_with_prices}/{list.total_items} priced</span>
                  </div>
                )}
                {list.total_items > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green rounded-full transition-[width] duration-300" style={{ width: `${list.completion_percentage}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{list.completed_items}/{list.total_items} done</span>
                  </div>
                )}
              </div>
              {list.completion_percentage === 100 && (
                <div className="flex items-center gap-1.5 mt-3 px-3 py-2 bg-green-light text-green rounded-sm text-sm font-medium">
                  <CheckCircle size={16} /><span>Completed!</span>
                </div>
              )}
            </div>
          ))}

          {/* Create new list card */}
          <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-300 rounded-lg py-10 px-5 cursor-pointer min-h-[140px] hover:border-primary hover:bg-primary-light transition-all group" onClick={() => setShowCreateForm(true)}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-500 mb-3 group-hover:bg-primary group-hover:text-white transition-all"><Plus size={24} /></div>
            <span className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">Create New List</span>
          </div>
        </div>
      )}
    </div>
  )
}
