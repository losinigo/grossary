import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ScanBarcode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import BarcodeScanner from '../../components/BarcodeScanner'
import './Forms.css'


const UNIT_PRESETS = {
  piece: { name: 'piece', abbreviation: 'pc' },
  weight: {
    kilogram: { name: 'kilogram', abbreviation: 'kg' },
    gram: { name: 'gram', abbreviation: 'g' },
    pound: { name: 'pound', abbreviation: 'lb' },
  },
  volume: {
    liter: { name: 'liter', abbreviation: 'L' },
    milliliter: { name: 'milliliter', abbreviation: 'mL' },
    gallon: { name: 'gallon', abbreviation: 'gal' },
  },
}

export default function AddItem() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState(location.state?.barcode || '')
  const [unitType, setUnitType] = useState('piece')
  const [unitName, setUnitName] = useState('piece')
  const [unitAbbreviation, setUnitAbbreviation] = useState('pc')
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleScan = useCallback((code) => {
    setBarcode(code)
    setScanning(false)
  }, [])

  const handleUnitTypeChange = (type) => {
    setUnitType(type)
    if (type === 'piece') {
      setUnitName('piece')
      setUnitAbbreviation('pc')
    } else {
      const firstUnit = Object.keys(UNIT_PRESETS[type])[0]
      setUnitName(firstUnit)
      setUnitAbbreviation(UNIT_PRESETS[type][firstUnit].abbreviation)
    }
  }

  const handleUnitChange = (unit) => {
    setUnitName(unit)
    setUnitAbbreviation(UNIT_PRESETS[unitType][unit].abbreviation)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Item name is required.')
    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('products').insert({
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      unit_type: unitType,
      unit_name: unitName,
      unit_abbreviation: unitAbbreviation,
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
          Unit Type *
          <select className="form-input" value={unitType} onChange={(e) => handleUnitTypeChange(e.target.value)}>
            <option value="piece">Individual Items (pieces, bottles, etc.)</option>
            <option value="weight">Sold by Weight (meat, produce, etc.)</option>
            <option value="volume">Sold by Volume (liquids, etc.)</option>
          </select>
        </label>

        {unitType !== 'piece' && (
          <label className="form-label">
            Unit
            <select className="form-input" value={unitName} onChange={(e) => handleUnitChange(e.target.value)}>
              {Object.entries(UNIT_PRESETS[unitType]).map(([key, unit]) => (
                <option key={key} value={key}>{unit.name} ({unit.abbreviation})</option>
              ))}
            </select>
          </label>
        )}

        <label className="form-label">
          Barcode {unitType === 'piece' ? '' : '(optional for weighted items)'}
          <div className="input-with-action">
            <input className="form-input" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder={unitType === 'piece' ? 'Scan or type barcode number' : 'Most weighted items don\'t have barcodes'} />
            <button type="button" className="input-action-btn" onClick={() => setScanning(true)}>
              <ScanBarcode size={20} />
            </button>
          </div>
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
