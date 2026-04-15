import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Check, X, Trash2, Minus, MapPin } from 'lucide-react'
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
  const [estimationMode, setEstimationMode] = useState('optimized')
  const [selectedStoreId, setSelectedStoreId] = useState(null)

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['shopping-list', id, estimationMode, selectedStoreId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_shopping_list_summary_with_mode', { 
        list_uuid: id,
        estimation_mode: estimationMode,
        specific_store_id: selectedStoreId
      })
      return data?.[0] || null
    },
    enabled: !!id,
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['shopping-list-items', id, estimationMode, selectedStoreId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_shopping_list_price_estimates_with_mode', { 
        list_uuid: id,
        estimation_mode: estimationMode,
        specific_store_id: selectedStoreId
      })
      return data || []
    },
    enabled: !!id,
  })

  const { data: stores } = useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name, address').order('name')
      return data || []
    },
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

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ quantity })
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

  const handleModeChange = (mode) => {
    setEstimationMode(mode)
    if (mode !== 'specific_store') {
      setSelectedStoreId(null)
    }
  }

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'near_me': return 'Near Me'
      case 'specific_store': return 'Specific Store'
      case 'optimized': return 'Optimized'
      default: return 'Optimized'
    }
  }

  const getModeDescription = (mode) => {
    switch (mode) {
      case 'near_me': return 'Average prices from nearby stores'
      case 'specific_store': return 'Prices from selected store only'
      case 'optimized': return 'Best deals from different stores'
      default: return 'Best deals from different stores'
    }
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
        <div className="estimation-modes">
          <div className="mode-selector">
            <label className="mode-label">Price Estimation:</label>
            <div className="mode-buttons">
              {['optimized', 'near_me', 'specific_store'].map((mode) => (
                <button
                  key={mode}
                  className={`mode-btn ${estimationMode === mode ? 'active' : ''}`}
                  onClick={() => handleModeChange(mode)}
                >
                  {getModeLabel(mode)}
                </button>
              ))}
            </div>
            <p className="mode-description">{getModeDescription(estimationMode)}</p>
          </div>
          
          {estimationMode === 'specific_store' && (
            <div className="store-selector">
              <select 
                className="store-select" 
                value={selectedStoreId || ''} 
                onChange={(e) => setSelectedStoreId(e.target.value || null)}
              >
                <option value="">Select a store...</option>
                {stores?.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}{store.address ? ` — ${store.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
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

              <div className="item-qty-stepper">
                <button
                  className="qty-btn"
                  onClick={() => {
                    const step = item.unit_type === 'weight' ? 0.1 : 1
                    const next = Math.max(step, parseFloat(item.quantity) + step)
                    updateQuantity.mutate({ itemId: item.item_id, quantity: parseFloat(next.toFixed(2)) })
                  }}
                  disabled={updateQuantity.isPending}
                >
                  <Plus size={14} />
                </button>
                <input
                  className="qty-input"
                  type="number"
                  min="0"
                  step={item.unit_type === 'weight' ? '0.1' : '1'}
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val) && val > 0)
                      updateQuantity.mutate({ itemId: item.item_id, quantity: val })
                  }}
                />
                 <button
                  className="qty-btn"
                  onClick={() => {
                    const step = item.unit_type === 'weight' ? 0.1 : 1
                    const next = Math.max(step, parseFloat(item.quantity) - step)
                    updateQuantity.mutate({ itemId: item.item_id, quantity: parseFloat(next.toFixed(2)) })
                  }}
                  disabled={updateQuantity.isPending}
                >
                  <Minus size={14} />
                </button>
              </div>

              <div className="item-info">
                <div className="item-name">
                  {item.product_name}
                  {item.product_brand && <span className="item-brand"> ({item.product_brand})</span>}
                </div>
                <div className="item-sub-row">
                  {item.has_price_data && (
                    <span className="item-store-info">
                      <MapPin size={11} />
                      {estimationMode === 'near_me' && item.price_count_nearby > 1
                        ? `Avg. ${item.price_count_nearby} stores`
                        : item.store_name}
                      {item.distance_km && ` · ${item.distance_km}km`}
                    </span>
                  )}
                  {item.notes && <span className="item-notes">{item.notes}</span>}
                </div>
              </div>

              <div className="item-price-col">
                {item.has_price_data ? (
                  <span className="item-price-inline">
                    ₱{Number(item.estimated_price).toFixed(2)}
                    {item.is_best_deal && <span className="best-deal-badge">★</span>}
                  </span>
                ) : (
                  <span className="item-no-price-inline">No price</span>
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