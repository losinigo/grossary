/**
 * AddPrice — Form to submit a price for a product at a specific store.
 * Supports pre-filling from ProductDetail's "Update Price" button.
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useUserRole } from '../../lib/hooks/useUserRole'
import useProductSearch from '../../lib/hooks/useProductSearch'
import useStoreList from '../../lib/hooks/useStoreList'
import BackButton from '../../components/ui/BackButton'
import ProductSearchInput from '../../components/ui/ProductSearchInput'
import EmptyState from '../../components/ui/EmptyState'

const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400'
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-gray-500'
const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23AEAEB2' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] pr-9`

export default function AddPrice() {
  const { user } = useAuth()
  const { canConfirmPrices, isLoading: roleLoading } = useUserRole()
  const navigate = useNavigate()
  const prefill = useLocation().state

  const [productId, setProductId] = useState(prefill?.productId || '')
  const [productDisplay, setProductDisplay] = useState(
    prefill?.productId ? `${prefill.productName}${prefill.productBrand ? ` (${prefill.productBrand})` : ''}` : '',
  )
  const [productUnit, setProductUnit] = useState(null)
  const [storeId, setStoreId] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [productSearch, setProductSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: products } = useProductSearch(productSearch)
  const { data: stores } = useStoreList()

  /* ── Handlers ────────────────────────────────────────────── */

  const handleProductChange = (val) => {
    setProductSearch(val)
    setProductId('')
    setProductDisplay('')
  }

  const handleProductSelect = (p) => {
    setProductId(p.id)
    setProductDisplay(`${p.name}${p.brand ? ` (${p.brand})` : ''}`)
    setProductUnit(p)
    setProductSearch('')
    if (p.unit_type === 'piece') setQuantity('1')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId || !storeId || !price) return setError('All fields are required.')
    if (parseFloat(price) <= 0) return setError('Price must be greater than 0.')
    if (parseFloat(quantity) <= 0) return setError('Quantity must be greater than 0.')
    setSubmitting(true); setError('')
    const { error: dbError } = await supabase.from('prices').insert({ product_id: productId, store_id: storeId, price: parseFloat(price), unit_quantity: parseFloat(quantity), user_id: user.id })
    if (dbError) { setError(dbError.message); setSubmitting(false) }
    else navigate('/contribute', { state: { success: 'Price added!' } })
  }

  /* ── Render ──────────────────────────────────────────────── */
if (roleLoading) return <div className="page"><p>Loading...</p></div>

  if (!canConfirmPrices) {
    return (
      <div className="page">
        <BackButton onClick={() => navigate('/contribute')} />
        <EmptyState
          icon={<Lock size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="Sign in to update prices"
          message="Only logged-in users can report grocery prices."
          action={<button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity" onClick={() => navigate('/contribute')}>Go Back</button>}
        />
      </div>
    )
  }

  
  return (
    <div className="page">
      <BackButton onClick={() => navigate('/contribute')} />
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Update Price</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Report a price you saw in store.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <ProductSearchInput
          value={productId ? productDisplay : productSearch}
          onChange={handleProductChange}
          onSelect={handleProductSelect}
          results={products || []}
          showDropdown={!productId}
        />

        <label className={labelCls}>Store *
          <select className={selectCls} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select store</option>
            {stores?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.address ? ` — ${s.address}` : ''}</option>)}
          </select>
        </label>

        {productUnit && productUnit.unit_type !== 'piece' && (
          <label className={labelCls}>Quantity ({productUnit.unit_abbreviation}) *
            <input className={inputCls} type="number" step={productUnit.unit_type === 'weight' ? '0.1' : '0.01'} min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={`e.g. 0.5 ${productUnit.unit_abbreviation}`} />
          </label>
        )}

        <label className={labelCls}>
          {productUnit && productUnit.unit_type !== 'piece' ? `Total Price (₱${quantity && parseFloat(quantity) > 0 ? ` for ${quantity} ${productUnit.unit_abbreviation}` : ''}) *` : 'Price *'}
          <input className={inputCls} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          {productUnit && productUnit.unit_type !== 'piece' && price && quantity && parseFloat(price) > 0 && parseFloat(quantity) > 0 && (
            <small className="text-xs text-primary font-medium mt-1">₱{(parseFloat(price) / parseFloat(quantity)).toFixed(2)} per {productUnit.unit_abbreviation}</small>
          )}
        </label>

        {error && <p className="text-sm text-red font-medium">{error}</p>}
        <button type="submit" className="w-full px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity disabled:opacity-50" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Price'}</button>
      </form>
    </div>
  )
}
