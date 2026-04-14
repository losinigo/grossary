import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Check, X, Trash2, Edit3 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './ShoppingListDetail.css'

export default function ShoppingListDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddItem, setShowAddItem] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['shopping-list', id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_shopping_list_summary', { 
        list_uuid: id 
      })
      return data?.[0] || null
    },
    enabled: !!id,
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['shopping-list-items', id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_shopping_list_price_estimates', { 
        list_uuid: id 
      })
      return data || []
    },
    enabled: !!id,
  })

  const { data: products } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: async () => {
      if (!productSearch.trim()) return []
      const { data } = await supabase
        .from('products')
        .select('id, name, brand, unit_type, unit_name, unit_abbreviation')
        .or(`name.ilike.%${productSearch}%,brand.ilike.%${productSearch}%,barcode.eq.${productSearch}`)
        .limit(10)
      return data || []
    },
    enabled: productSearch.length > 1,
  })

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity, notes }) => {
      const { error } = await supabase.from('shopping_list_items').insert({
        shopping_list_id: id,
        product_id: productId,
        quantity: parseFloat(quantity),
        notes: notes.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list-items', id] })
      queryClient.invalidateQueries({ queryKey: ['shopping-list', id] })
      setShowAddItem(false)
      setProductSearch('')
      setSelectedProduct(null)
      setQuantity('1')
      setNotes('')
    },
  })

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, completed }) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ 
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list-items', id] })
      queryClient.invalidateQueries({ queryKey: ['shopping-list', id] })
    },
  })

  const removeItem = useMutation({
    mutationFn: async (itemId) => {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list-items', id] })
      queryClient.invalidateQueries({ queryKey: ['shopping-list', id] })
    },
  })

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!selectedProduct || !quantity) return
    setAdding(true)
    try {
      await addItem.mutateAsync({
        productId: selectedProduct.id,
        quantity,
        notes,
      })
    } finally {
      setAdding(false)
    }
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setProductSearch(`${product.name}${product.brand ? ` (${product.brand})` : ''}`)
    if (product.unit_type === 'piece') setQuantity('1')
  }

  if (listLoading) return <div className="page"><p>Loading...</p></div>
  if (!list) return <div className="page"><p>List not found.</p></div>

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/lists')}>
        <ArrowLeft size={18} /> Back to Lists
      </button>

      <div className="list-header">
        <div className="list-info">
          <h2 className="list-title">{list.list_name}</h2>
          {list.list_description && <p className="list-description">{list.list_description}</p>}
          
          {/* Price estimate summary */}
          {list.estimated_total && (
            <div className="price-summary">
              <div className="price-total">
                <span className="price-label">Estimated Total:</span>
                <span className="price-amount">₱{Number(list.estimated_total).toFixed(2)}</span>
              </div>
              {list.estimated_remaining && list.estimated_remaining !== list.estimated_total && (
                <div className="price-remaining">
                  <span className="price-label">Remaining:</span>
                  <span className="price-amount">₱{Number(list.estimated_remaining).toFixed(2)}</span>
                </div>
              )}
              <div className="price-coverage">
                {list.items_with_prices}/{list.total_items} items have price data
                {list.best_deals_count > 0 && (
                  <span className="best-deals-indicator"> • {list.best_deals_count} best deals found!</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {list.total_items > 0 && (
          <div className="list-progress">
            <div className="progress-circle">
              <span className="progress-percentage">{Math.round(list.completion_percentage)}%</span>
            </div>
            <span className="progress-label">{list.completed_items}/{list.total_items} done</span>
          </div>
        )}
      </div>

      <div className="list-actions">
        <button className="btn-primary" onClick={() => setShowAddItem(true)}>
          <Plus size={18} /> Add Item
        </button>
      </div>

      {showAddItem && (
        <div className="add-item-form">
          <form onSubmit={handleAddItem}>
            <div className="form-group">
              <input
                className="form-input"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setSelectedProduct(null) }}
                placeholder="Search for a product..."
                autoFocus
              />
              
              {products?.length > 0 && !selectedProduct && (
                <div className="dropdown">
                  {products.map((p) => (
                    <button key={p.id} type="button" className="dropdown-item" onClick={() => handleProductSelect(p)}>
                      {p.name} {p.brand && <span className="text-muted">— {p.brand}</span>}
                      {p.unit_type !== 'piece' && <span className="text-muted"> • per {p.unit_abbreviation}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <>
                {selectedProduct.unit_type !== 'piece' && (
                  <div className="form-group">
                    <input
                      className="form-input"
                      type="number"
                      step={selectedProduct.unit_type === 'weight' ? '0.1' : '0.01'}
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder={`Quantity (${selectedProduct.unit_abbreviation})`}
                    />
                  </div>
                )}

                <div className="form-group">
                  <input
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={adding}>
                    {adding ? 'Adding...' : 'Add to List'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {itemsLoading && <p className="loading-text">Loading items...</p>}

      {!itemsLoading && items?.length === 0 && (
        <div className="empty-items">
          <p className="empty-title">No items in this list yet</p>
          <p className="empty-subtitle">Add your first item to get started.</p>
        </div>
      )}

      {items?.length > 0 && (
        <div className="items-list">
          {items.map((item) => (
            <div key={item.item_id} className={`item-card ${item.is_completed ? 'completed' : ''}`}>
              <button
                className="item-checkbox"
                onClick={() => toggleItem.mutate({ itemId: item.item_id, completed: !item.is_completed })}
                disabled={toggleItem.isPending}
              >
                {item.is_completed ? <Check size={16} /> : <div className="checkbox-empty" />}
              </button>

              <div className="item-info">
                <div className="item-name">
                  {item.product_name}
                  {item.product_brand && <span className="item-brand"> ({item.product_brand})</span>}
                </div>
                
                <div className="item-details">
                  {item.unit_type !== 'piece' ? (
                    <span className="item-quantity">{item.quantity} {item.unit_abbreviation}</span>
                  ) : (
                    item.quantity > 1 && <span className="item-quantity">{item.quantity}x</span>
                  )}
                  {item.notes && <span className="item-notes">{item.notes}</span>}
                </div>
                
                {/* Price estimate info */}
                {item.has_price_data ? (
                  <div className="item-price-info">
                    <div className="item-price">
                      ₱{Number(item.estimated_price).toFixed(2)}
                      {item.unit_type !== 'piece' && (
                        <span className="price-per-unit"> (₱{Number(item.price_per_unit).toFixed(2)}/{item.unit_abbreviation})</span>
                      )}
                      {item.is_best_deal && <span className="best-deal-badge">Best Deal!</span>}
                    </div>
                    <div className="item-store-info">
                      {item.is_best_deal ? 'Lowest price at' : 'Best recent price at'} {item.store_name}
                      {item.distance_km && <span className="store-distance"> • {item.distance_km}km away</span>}
                    </div>
                  </div>
                ) : (
                  <div className="item-no-price">
                    <span className="no-price-text">No recent price data</span>
                  </div>
                )}
              </div>

              <button
                className="item-remove"
                onClick={() => removeItem.mutate(item.item_id)}
                disabled={removeItem.isPending}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}