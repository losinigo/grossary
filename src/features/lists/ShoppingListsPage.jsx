import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, Trash2, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './ShoppingListsPage.css'

export default function ShoppingListsPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: lists, isLoading } = useQuery({
    queryKey: ['shopping-lists', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_shopping_lists', { user_uuid: user.id })
      
      // Get price estimates for each list
      if (data?.length > 0) {
        const listsWithPrices = await Promise.all(
          data.map(async (list) => {
            const { data: summary } = await supabase.rpc('get_shopping_list_summary', {
              list_uuid: list.id
            })
            return {
              ...list,
              estimated_total: summary?.[0]?.estimated_total || null,
              items_with_prices: summary?.[0]?.items_with_prices || 0
            }
          })
        )
        return listsWithPrices
      }
      
      return data || []
    },
    enabled: !!user,
  })

  const createList = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({ name, description, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists', user.id] })
      setShowCreateForm(false)
      setNewListName('')
      setNewListDescription('')
      navigate(`/lists/${newList.id}`)
    },
    onError: () => alert('Failed to create list. Please try again.'),
  })

  const deleteList = useMutation({
    mutationFn: async (listId) => {
      const { error } = await supabase.from('shopping_lists').delete().eq('id', listId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists', user.id] })
    },
    onError: () => alert('Failed to delete list. Please try again.'),
  })

  const handleCreateList = async (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setCreating(true)
    try {
      await createList.mutateAsync({
        name: newListName.trim(),
        description: newListDescription.trim() || null,
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteList = (e, listId) => {
    e.stopPropagation()
    if (confirm('Delete this shopping list?')) {
      deleteList.mutate(listId)
    }
  }

  if (authLoading) return <div className="page"><p>Loading...</p></div>

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <ShoppingCart size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="empty-title">Sign in to create shopping lists</p>
          <p className="empty-subtitle">Keep track of what you need to buy and compare prices.</p>
          <button className="btn-primary" onClick={signInWithGoogle}>Sign in with Google</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Shopping Lists</h2>
      </div>

      {showCreateForm && (
        <div className="create-form-overlay">
          <form className="create-form" onSubmit={handleCreateList}>
            <h3 className="create-form-title">New Shopping List</h3>
            <input
              className="form-input"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name (e.g. Weekly Groceries)"
              autoFocus
            />
            <input
              className="form-input"
              value={newListDescription}
              onChange={(e) => setNewListDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="create-form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={creating || !newListName.trim()}>
                {creating ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="loading-text">Loading your lists...</p>}

      {!isLoading && lists?.length === 0 && (
        <div className="empty-state">
          <ShoppingCart size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="empty-title">No shopping lists yet</p>
          <p className="empty-subtitle">Create your first list to start organizing your grocery shopping.</p>
          <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
            <Plus size={18} /> Create Your First List
          </button>
        </div>
      )}

      {lists?.length > 0 && (
        <div className="lists-grid">
          {lists.map((list) => (
            <div key={list.id} className="list-card" onClick={() => navigate(`/lists/${list.id}`)}>
              <div className="list-card-header">
                <div className="list-card-info">
                  <h3 className="list-card-name">{list.name}</h3>
                  {list.description && <p className="list-card-description">{list.description}</p>}
                </div>
                <button
                  className="list-card-delete"
                  onClick={(e) => handleDeleteList(e, list.id)}
                  disabled={deleteList.isPending}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="list-card-stats">
                <div className="list-card-items">
                  <ShoppingCart size={14} />
                  <span>{list.total_items} items</span>
                </div>
                
                {/* Price estimate */}
                {list.estimated_total && (
                  <div className="list-card-price">
                    <span className="price-estimate">₱{Number(list.estimated_total).toFixed(2)} estimated</span>
                    <span className="price-coverage">{list.items_with_prices}/{list.total_items} priced</span>
                  </div>
                )}
                
                {list.total_items > 0 && (
                  <div className="list-card-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${list.completion_percentage}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {list.completed_items}/{list.total_items} done
                    </span>
                  </div>
                )}
              </div>

              {list.completion_percentage === 100 && (
                <div className="list-card-completed">
                  <CheckCircle size={16} />
                  <span>Completed!</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Add new list card */}
          <div className="add-list-card" onClick={() => setShowCreateForm(true)}>
            <div className="add-list-icon">
              <Plus size={24} />
            </div>
            <span className="add-list-text">Create New List</span>
          </div>
        </div>
      )}
    </div>
  )
}