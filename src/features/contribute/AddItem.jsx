import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ScanBarcode } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import BarcodeScanner from '../../components/BarcodeScanner'

const UNIT_PRESETS = {
  piece: { name: 'piece', abbreviation: 'pc' },
  weight: { kilogram: { name: 'kilogram', abbreviation: 'kg' }, gram: { name: 'gram', abbreviation: 'g' }, pound: { name: 'pound', abbreviation: 'lb' } },
  volume: { liter: { name: 'liter', abbreviation: 'L' }, milliliter: { name: 'milliliter', abbreviation: 'mL' }, gallon: { name: 'gallon', abbreviation: 'gal' } },
}

const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400'
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-gray-500'
const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23AEAEB2' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] pr-9`

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

  const handleScan = useCallback((code) => { setBarcode(code); setScanning(false) }, [])

  const handleUnitTypeChange = (type) => {
    setUnitType(type)
    if (type === 'piece') { setUnitName('piece'); setUnitAbbreviation('pc') }
    else { const first = Object.keys(UNIT_PRESETS[type])[0]; setUnitName(first); setUnitAbbreviation(UNIT_PRESETS[type][first].abbreviation) }
  }

  const handleUnitChange = (unit) => { setUnitName(unit); setUnitAbbreviation(UNIT_PRESETS[unitType][unit].abbreviation) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Item name is required.')
    setSubmitting(true); setError('')
    const { error: dbError } = await supabase.from('products').insert({ name: name.trim(), brand: brand.trim() || null, barcode: barcode.trim() || null, unit_type: unitType, unit_name: unitName, unit_abbreviation: unitAbbreviation, created_by: user.id })
    if (dbError) { setError(dbError.code === '23505' ? 'A product with this barcode already exists.' : dbError.message); setSubmitting(false) }
    else navigate('/contribute', { state: { success: 'Item added!' } })
  }

  return (
    <div className="page">
      <button className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1" onClick={() => navigate('/contribute')}><ArrowLeft size={18} /> Back</button>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Add New Item</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Add a grocery product to the database.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className={labelCls}>Item Name *<input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Whole Milk 1L" /></label>
        <label className={labelCls}>Brand<input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Alaska" /></label>
        <label className={labelCls}>Unit Type *
          <select className={selectCls} value={unitType} onChange={(e) => handleUnitTypeChange(e.target.value)}>
            <option value="piece">Individual Items (pieces, bottles, etc.)</option>
            <option value="weight">Sold by Weight (meat, produce, etc.)</option>
            <option value="volume">Sold by Volume (liquids, etc.)</option>
          </select>
        </label>
        {unitType !== 'piece' && (
          <label className={labelCls}>Unit
            <select className={selectCls} value={unitName} onChange={(e) => handleUnitChange(e.target.value)}>
              {Object.entries(UNIT_PRESETS[unitType]).map(([key, unit]) => <option key={key} value={key}>{unit.name} ({unit.abbreviation})</option>)}
            </select>
          </label>
        )}
        <label className={labelCls}>
          Barcode {unitType === 'piece' ? '' : '(optional for weighted items)'}
          <div className="flex items-center gap-2">
            <input className={`${inputCls} flex-1`} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder={unitType === 'piece' ? 'Scan or type barcode number' : "Most weighted items don't have barcodes"} />
            <button type="button" className="flex items-center justify-center w-[42px] h-[42px] rounded-sm text-primary bg-primary-light shrink-0 hover:opacity-80 transition-opacity" onClick={() => setScanning(true)}><ScanBarcode size={20} /></button>
          </div>
        </label>
        {error && <p className="text-sm text-red font-medium">{error}</p>}
        <button type="submit" className="w-full px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity disabled:opacity-50" disabled={submitting}>{submitting ? 'Adding...' : 'Add Item'}</button>
      </form>
      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
