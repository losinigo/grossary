import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'

const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400'
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-gray-500'
const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23AEAEB2' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] pr-9`
const dropdownItem = 'block w-full px-3.5 py-2.5 text-left text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors'

export default function AddPrice() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const prefill = useLocation().state
  const [productId, setProductId] = useState(prefill?.productId || '')
  const [productDisplay, setProductDisplay] = useState(prefill?.productId ? `${prefill.productName}${prefill.productBrand ? ` (${prefill.productBrand})` : ''}` : '')
  const [productUnit, setProductUnit] = useState(null)
  const [storeId, setStoreId] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [productSearch, setProductSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: products } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: async () => { if (!productSearch.trim()) return []; const { data } = await supabase.from('products').select('id, name, brand, unit_type, unit_name, unit_abbreviation').or(`name.ilike.%${productSearch}%,brand.ilike.%${productSearch}%,barcode.eq.${productSearch}`).limit(10); return data || [] },
    enabled: productSearch.length > 1,
  })

  const { data: stores } = useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => { const { data } = await supabase.from('stores').select('id, name, address').order('name'); return data || [] },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId || !storeId || !price) return setError('All fields are required.')
    if (parseFloat(price) <= 0) return setError('Price must be greater than 0.')
    if (parseFloat(quantity) <= 0) return setError('Quantity must be greater than 0.')
    setSubmitting(true); setError('')
    const { error: dbError } = await supabase.from('prices').insert({ product_id: productId, store_id: storeId, price: parseFloat(price), unit_quantity: parseFloat(quantity), user_id: user.id })
    if (dbError) { setError(dbError.message); setSubmitting(false) } else navigate('/contribute', { state: { success: 'Price added!' } })
  }

  return (
    <div className="page">
      <button className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1" onClick={() => navigate('/contribute')}><ArrowLeft size={18} /> Back</button>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Update Price</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Report a price you saw in store.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="relative">
          <label className={labelCls}>Search Product *
            <input className={inputCls} value={productId ? productDisplay : productSearch} onChange={(e) => { setProductSearch(e.target.value); setProductId(''); setProductDisplay('') }} placeholder="Search by name, brand, or barcode" />
          </label>
          {products?.length > 0 && !productId && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-sm shadow-md overflow-hidden z-100">
              {products.map((p) => (
                <button key={p.id} type="button" className={dropdownItem} onClick={() => { setProductId(p.id); setProductDisplay(`${p.name}${p.brand ? ` (${p.brand})` : ''}`); setProductUnit(p); setProductSearch(''); if (p.unit_type === 'piece') setQuantity('1') }}>
                  {p.name} {p.brand && <span className="text-gray-500">— {p.brand}</span>}
                  {p.unit_type !== 'piece' && <span className="text-gray-500"> • per {p.unit_abbreviation}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

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
