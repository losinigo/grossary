import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './Forms.css'

export default function AddPrice() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state
  const [productId, setProductId] = useState(prefill?.productId || '')
  const [productDisplay, setProductDisplay] = useState(
    prefill?.productId ? `${prefill.productName}${prefill.productBrand ? ` (${prefill.productBrand})` : ''}` : ''
  )
  const [storeId, setStoreId] = useState('')
  const [price, setPrice] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: products } = useQuery({
    queryKey: ['products', productSearch],
    queryFn: async () => {
      if (!productSearch.trim()) return []
      const { data } = await supabase
        .from('products')
        .select('id, name, brand')
        .or(`name.ilike.%${productSearch}%,brand.ilike.%${productSearch}%,barcode.eq.${productSearch}`)
        .limit(10)
      return data || []
    },
    enabled: productSearch.length > 1,
  })

  const { data: stores } = useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name, address').order('name')
      return data || []
    },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId || !storeId || !price) return setError('All fields are required.')
    if (parseFloat(price) <= 0) return setError('Price must be greater than 0.')
    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('prices').insert({
      product_id: productId,
      store_id: storeId,
      price: parseFloat(price),
      user_id: user.id,
    })

    if (dbError) {
      setError(dbError.message)
      setSubmitting(false)
    } else {
      navigate('/contribute', { state: { success: 'Price added!' } })
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/contribute')}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="page-title">Update Price</h2>
      <p className="page-subtitle">Report a price you saw in store.</p>

      <form className="form" onSubmit={handleSubmit}>
        <label className="form-label">
          Search Product *
          <input
            className="form-input"
            value={productId ? productDisplay : productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setProductId(''); setProductDisplay('') }}
            placeholder="Search by name, brand, or barcode"
          />
        </label>

        {products?.length > 0 && !productId && (
          <div className="dropdown">
            {products.map((p) => (
              <button key={p.id} type="button" className="dropdown-item" onClick={() => { setProductId(p.id); setProductDisplay(`${p.name}${p.brand ? ` (${p.brand})` : ''}`); setProductSearch('') }}>
                {p.name} {p.brand && <span className="text-muted">— {p.brand}</span>}
              </button>
            ))}
          </div>
        )}

        <label className="form-label">
          Store *
          <select className="form-input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select store</option>
            {stores?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.address ? ` — ${s.address}` : ''}</option>)}
          </select>
        </label>

        <label className="form-label">
          Price *
          <input className="form-input" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary btn-full" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Price'}
        </button>
      </form>
    </div>
  )
}
