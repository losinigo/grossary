import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ScanBarcode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import BarcodeScanner from '../../components/BarcodeScanner'
import './Forms.css'

const categories = ['Dairy', 'Meat', 'Produce', 'Bakery', 'Beverages', 'Snacks', 'Frozen', 'Canned Goods', 'Condiments', 'Household', 'Personal Care', 'Other']

export default function AddItem() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState(location.state?.barcode || '')
  const [category, setCategory] = useState('')
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleScan = useCallback((code) => {
    setBarcode(code)
    setScanning(false)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Item name is required.')
    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('products').insert({
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      category: category || null,
      created_by: user.id,
    })

    if (dbError) {
      setError(dbError.code === '23505' ? 'A product with this barcode already exists.' : dbError.message)
      setSubmitting(false)
    } else {
      navigate('/contribute', { state: { success: 'Item added!' } })
    }
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/contribute')}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="page-title">Add New Item</h2>
      <p className="page-subtitle">Add a grocery product to the database.</p>

      <form className="form" onSubmit={handleSubmit}>
        <label className="form-label">
          Item Name *
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Whole Milk 1L" />
        </label>

        <label className="form-label">
          Brand
          <input className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Alaska" />
        </label>

        <label className="form-label">
          Barcode
          <div className="input-with-action">
            <input className="form-input" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode number" />
            <button type="button" className="input-action-btn" onClick={() => setScanning(true)}>
              <ScanBarcode size={20} />
            </button>
          </div>
        </label>

        <label className="form-label">
          Category
          <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary btn-full" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
