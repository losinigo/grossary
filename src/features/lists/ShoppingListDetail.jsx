/**
 * ShoppingListDetail — Manages items in a single shopping list.
 * Supports adding products, adjusting quantities, toggling completion,
 * and switching between price estimation modes (optimized, near me, specific store).
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Check, Trash2, Minus, MapPin, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import useProductSearch from '../../lib/hooks/useProductSearch'
import useStoreList from '../../lib/hooks/useStoreList'
import BackButton from '../../components/ui/BackButton'
import ProductSearchInput from '../../components/ui/ProductSearchInput'

const inputCls = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400'
const btnPrimary = 'inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-5 bg-primary text-white text-sm font-semibold rounded-sm hover:opacity-88 transition-opacity disabled:opacity-50'
const btnSecondary = 'inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-5 bg-gray-100 text-gray-700 text-sm font-medium rounded-sm hover:bg-gray-200 transition-colors'

const MODE_LABELS = { near_me: 'Near Me', specific_store: 'Specific Store', optimized: 'Optimized' }
const MODE_DESCS = { near_me: 'Average prices from nearby stores', specific_store: 'Prices from selected store only', optimized: 'Best deals from different stores' }

export default function ShoppingListDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  /* ── Local state ─────────────────────────────────────────── */

  const [showAddItem, setShowAddItem] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [estimationMode, setEstimationMode] = useState('optimized')
  const [selectedStoreId, setSelectedStoreId] = useState(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['shopping-list', id, estimationMode, selectedStoreId],
    queryFn: async () => { const { data } = await supabase.rpc('get_shopping_list_summary_with_mode', { list_uuid: id, estimation_mode: estimationMode, specific_store_id: selectedStoreId }); return data?.[0] || null },
    enabled: !!id,
  })

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['shopping-list-items', id, estimationMode, selectedStoreId],
    queryFn: async () => { const { data } = await supabase.rpc('get_shopping_list_price_estimates_with_mode', { list_uuid: id, estimation_mode: estimationMode, specific_store_id: selectedStoreId }); return data || [] },
    enabled: !!id,
  })

  const { data: stores } = useStoreList()
  const { data: products } = useProductSearch(productSearch)

  /* ── Mutations ───────────────────────────────────────────── */

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ['shopping-list-items', id] })
    queryClient.invalidateQueries({ queryKey: ['shopping-list', id] })
  }

  const updateList = useMutation({
    mutationFn: async ({ name, description }) => { const { error } = await supabase.from('shopping_lists').update({ name, description: description || null }).eq('id', id); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shopping-list', id] }); queryClient.invalidateQueries({ queryKey: ['shopping-lists'] }); setEditingTitle(false) },
    onError: () => alert('Failed to update list. Please try again.'),
  })

  const addItem = useMutation({
    mutationFn: async ({ productId, quantity, notes }) => { const { error } = await supabase.from('shopping_list_items').insert({ shopping_list_id: id, product_id: productId, quantity: parseFloat(quantity), notes: notes.trim() || null }); if (error) throw error },
    onSuccess: () => { invalidateList(); setShowAddItem(false); setProductSearch(''); setSelectedProduct(null); setQuantity('1'); setNotes('') },
    onError: () => alert('Failed to add item. Please try again.'),
  })

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, completed }) => { const { error } = await supabase.from('shopping_list_items').update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', itemId); if (error) throw error },
    onSuccess: invalidateList, onError: () => alert('Failed to update item.'),
  })

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }) => { const { error } = await supabase.from('shopping_list_items').update({ quantity }).eq('id', itemId); if (error) throw error },
    onSuccess: invalidateList, onError: () => alert('Failed to update quantity.'),
  })

  const removeItem = useMutation({
    mutationFn: async (itemId) => { const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId); if (error) throw error },
    onSuccess: invalidateList, onError: () => alert('Failed to remove item.'),
  })

  /* ── Handlers ────────────────────────────────────────────── */

  const handleAddItem = async (e) => { e.preventDefault(); if (!selectedProduct || !quantity) return; setAdding(true); try { await addItem.mutateAsync({ productId: selectedProduct.id, quantity, notes }) } finally { setAdding(false) } }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setProductSearch(`${product.name}${product.brand ? ` (${product.brand})` : ''}`)
    if (product.unit_type === 'piece') setQuantity('1')
  }

  const handleModeChange = (mode) => { setEstimationMode(mode); if (mode !== 'specific_store') setSelectedStoreId(null) }
  const handleEditOpen = () => { setEditName(list.list_name); setEditDescription(list.list_description || ''); setEditingTitle(true) }
  const handleEditSave = (e) => { e.preventDefault(); if (!editName.trim()) return; updateList.mutate({ name: editName.trim(), description: editDescription.trim() }) }

  /* ── Render ──────────────────────────────────────────────── */

  if (listLoading) return <div className="page"><p>Loading...</p></div>
  if (!list) return <div className="page"><p>List not found.</p></div>

  return (
    <div className="page">
      <BackButton onClick={() => navigate('/lists')} label="Back to Lists" />

      {/* List header + estimation mode */}
      <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-md px-4 py-5 shadow-sm mb-5">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <form className="flex flex-col gap-2 mb-3" onSubmit={handleEditSave}>
              <input className={`${inputCls} !py-2 !px-3`} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="List name" autoFocus />
              <input className={`${inputCls} !py-2 !px-3`} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description (optional)" />
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={() => setEditingTitle(false)}>Cancel</button>
                <button type="submit" className={btnPrimary} disabled={updateList.isPending || !editName.trim()}>{updateList.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-gray-900">{list.list_name}</h2>
              <button className="flex items-center justify-center w-7 h-7 rounded-sm text-gray-400 shrink-0 hover:bg-gray-100 hover:text-primary transition-all" onClick={handleEditOpen} aria-label="Edit list name"><Pencil size={15} /></button>
            </div>
          )}
          {!editingTitle && list.list_description && <p className="text-sm text-gray-500 leading-relaxed mb-4">{list.list_description}</p>}

          {/* Estimation mode tabs */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              {['optimized', 'near_me', 'specific_store'].map((mode) => (
                <button key={mode} className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-sm text-center transition-all ${estimationMode === mode ? 'bg-primary text-white font-semibold' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={() => handleModeChange(mode)}>
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">{MODE_DESCS[estimationMode]}</p>
          </div>

          {estimationMode === 'specific_store' && (
            <select className={`${inputCls} mt-4 appearance-none`} value={selectedStoreId || ''} onChange={(e) => setSelectedStoreId(e.target.value || null)}>
              <option value="">Select a store...</option>
              {stores?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.address ? ` — ${s.address}` : ''}</option>)}
            </select>
          )}

          {list.estimated_total && (
            <div className="bg-primary-light rounded-md p-4 mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 font-medium">Estimated Total:</span>
                <span className="text-lg font-bold text-primary">₱{Number(list.estimated_total).toFixed(2)}</span>
              </div>
              {list.estimated_remaining && list.estimated_remaining !== list.estimated_total && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 font-medium">Remaining:</span>
                  <span className="text-lg font-bold text-primary">₱{Number(list.estimated_remaining).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add item button */}
      <div className="mb-5">
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-sm hover:opacity-88 transition-opacity" onClick={() => setShowAddItem(true)}>
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Add item form */}
      {showAddItem && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
          <form onSubmit={handleAddItem}>
            <div className="mb-4">
              <ProductSearchInput
                value={productSearch}
                onChange={(val) => { setProductSearch(val); setSelectedProduct(null) }}
                onSelect={handleProductSelect}
                results={products || []}
                showDropdown={!selectedProduct}
                placeholder="Search for a product..."
                label=""
              />
            </div>
            {selectedProduct && (
              <>
                {selectedProduct.unit_type !== 'piece' && (
                  <div className="mb-4"><input className={inputCls} type="number" step={selectedProduct.unit_type === 'weight' ? '0.1' : '0.01'} min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={`Quantity (${selectedProduct.unit_abbreviation})`} /></div>
                )}
                <div className="mb-4"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" /></div>
                <div className="flex gap-3 mt-5">
                  <button type="button" className={btnSecondary} onClick={() => setShowAddItem(false)}>Cancel</button>
                  <button type="submit" className={btnPrimary} disabled={adding}>{adding ? 'Adding...' : 'Add to List'}</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {itemsLoading && <p className="text-center py-10 text-gray-500 text-sm">Loading items...</p>}

      {!itemsLoading && items?.length === 0 && (
        <div className="text-center py-15 px-5">
          <p className="text-base font-semibold text-gray-900 mb-2">No items in this list yet</p>
          <p className="text-sm text-gray-500">Add your first item to get started.</p>
        </div>
      )}

      {/* Item list */}
      {items?.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.item_id} className={`flex items-center gap-3 bg-white border border-gray-200 rounded-md px-4 py-4 shadow-sm transition-all ${item.is_completed ? 'opacity-60 bg-gray-50' : ''}`}>
              {/* Toggle completion */}
              <button className="flex items-center justify-center w-6 h-6 rounded-sm bg-primary text-white shrink-0 disabled:opacity-50 transition-all" onClick={() => toggleItem.mutate({ itemId: item.item_id, completed: !item.is_completed })} disabled={toggleItem.isPending}>
                {item.is_completed ? <Check size={16} /> : <div className="w-6 h-6 border-2 border-gray-300 rounded-sm bg-white" />}
              </button>

              {/* Quantity stepper */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button className="flex items-center justify-center w-[26px] h-5 rounded-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 disabled:opacity-40" onClick={() => { const step = item.unit_type === 'weight' ? 0.1 : 1; updateQuantity.mutate({ itemId: item.item_id, quantity: parseFloat((parseFloat(item.quantity) + step).toFixed(2)) }) }} disabled={updateQuantity.isPending}><Plus size={14} /></button>
                <input className="w-9 text-center py-0.5 border border-gray-200 rounded-sm text-[0.8rem] font-semibold text-primary bg-white outline-none focus:border-primary font-[inherit] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" min="0" step={item.unit_type === 'weight' ? '0.1' : '1'} value={item.quantity} onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) updateQuantity.mutate({ itemId: item.item_id, quantity: val }) }} />
                <button className="flex items-center justify-center w-[26px] h-5 rounded-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shrink-0 disabled:opacity-40" onClick={() => { const step = item.unit_type === 'weight' ? 0.1 : 1; updateQuantity.mutate({ itemId: item.item_id, quantity: parseFloat(Math.max(step, parseFloat(item.quantity) - step).toFixed(2)) }) }} disabled={updateQuantity.isPending}><Minus size={14} /></button>
              </div>

              {/* Product info */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className={`text-[0.95rem] font-medium text-gray-900 truncate min-w-0 ${item.is_completed ? 'line-through' : ''}`}>
                  {item.product_name}{item.product_brand && <span className="text-gray-500 font-normal"> ({item.product_brand})</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                  {item.has_price_data && <span className="inline-flex items-center gap-1 truncate min-w-0"><MapPin size={11} />{item.store_name}{item.distance_km && ` · ${item.distance_km}km`}</span>}
                  {item.notes && <span className="italic shrink-0">{item.notes}</span>}
                </div>
              </div>

              {/* Price */}
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                {item.has_price_data ? (
                  <>
                    <span className="text-sm font-bold text-green whitespace-nowrap">₱{Number(item.estimated_price).toFixed(2)}</span>
                    {item.is_best_deal && <span className="inline-block bg-green text-white text-[0.7rem] font-semibold px-1.5 py-0.5 rounded-full uppercase">★</span>}
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic whitespace-nowrap">No price</span>
                )}
              </div>

              {/* Remove */}
              <button className="flex items-center justify-center w-8 h-8 rounded-sm text-gray-400 hover:bg-red-light hover:text-red transition-all shrink-0 disabled:opacity-50" onClick={() => removeItem.mutate(item.item_id)} disabled={removeItem.isPending}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
