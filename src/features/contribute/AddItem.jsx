/**
 * AddItem — Form to add a new grocery product with name, brand, barcode, and unit type.
 * Supports barcode scanning via the device camera.
 */
import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ImagePlus, ScanBarcode, X, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useUserRole } from '../../lib/hooks/useUserRole'
import BarcodeScanner from '../../components/BarcodeScanner'
import BackButton from '../../components/ui/BackButton'
import EmptyState from '../../components/ui/EmptyState'

/** Predefined unit options grouped by type */
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
  const { canAddItems, isLoading: roleLoading } = useUserRole()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState(location.state?.barcode || '')
  const [unitType, setUnitType] = useState('piece')
  const [unitName, setUnitName] = useState('piece')
  const [unitAbbreviation, setUnitAbbreviation] = useState('pc')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  /* ── Handlers ────────────────────────────────────────────── */

  const handleScan = useCallback((code) => { setBarcode(code); setScanning(false) }, [])

  const handleUnitTypeChange = (type) => {
    setUnitType(type)
    if (type === 'piece') { setUnitName('piece'); setUnitAbbreviation('pc') }
    else { const first = Object.keys(UNIT_PRESETS[type])[0]; setUnitName(first); setUnitAbbreviation(UNIT_PRESETS[type][first].abbreviation) }
  }

  const handleUnitChange = (unit) => {
    setUnitName(unit)
    setUnitAbbreviation(UNIT_PRESETS[unitType][unit].abbreviation)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller.')
      return
    }
    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Item name is required.')
    setSubmitting(true); setError('')

    let imageUrl = null
    let imagePath = null
    if (imageFile) {
      const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
      imagePath = path
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, imageFile, { upsert: false })
      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error: dbError } = await supabase.from('products').insert({
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      image_url: imageUrl,
      unit_type: unitType,
      unit_name: unitName,
      unit_abbreviation: unitAbbreviation,
      created_by: user.id,
    })
    if (dbError) {
      if (imagePath) {
        await supabase.storage.from('product-images').remove([imagePath])
      }
      setError(dbError.code === '23505' ? 'A product with this barcode already exists.' : dbError.message)
      setSubmitting(false)
    }
    else navigate('/contribute', { state: { success: 'Item added!' } })
  }

  /* ── Render ──────────────────────────────────────────────── */
if (roleLoading) return <div className="page"><p>Loading...</p></div>

  if (!canAddItems) {
    return (
      <div className="page">
        <BackButton onClick={() => navigate('/contribute')} />
        <EmptyState
          icon={<Lock size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="Sign in to add items"
          message="Only logged-in users can add grocery products."
          action={<button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity" onClick={() => navigate('/contribute')}>Go Back</button>}
        />
      </div>
    )
  }

  
  return (
    <div className="page">
      <BackButton onClick={() => navigate('/contribute')} />
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Add New Item</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Add a grocery product to the database.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className={labelCls}>Item Name *<input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Whole Milk 1L" /></label>
        <label className={labelCls}>Brand<input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Alaska" /></label>

        <div className={labelCls}>
          <span>Product Photo</span>
          <div className="flex flex-col gap-3">
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                <img src={imagePreview} alt="" className="h-48 w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm"
                  onClick={clearImage}
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                <ImagePlus size={22} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Upload a product photo</span>
                <span className="text-xs text-gray-500">JPG, PNG, or WebP up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
            {imagePreview && (
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-sm bg-primary-light px-4 py-2 text-sm font-semibold text-primary">
                <ImagePlus size={16} />
                Change Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

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
