import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'

export default function AddStore() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const detectLocation = () => {
    if (!navigator.geolocation) return setError('Geolocation not supported')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      () => {
        setError('Could not get location. Enter manually.')
        setLocating(false)
      },
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !lat || !lng) return setError('Name and location are required.')
    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('stores').insert({
      name: name.trim(),
      address: address.trim() || null,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      created_by: user.id,
    })

    if (dbError) {
      setError(dbError.message)
      setSubmitting(false)
    } else {
      navigate('/contribute', { state: { success: 'Store added!' } })
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none transition-colors focus:border-primary font-[inherit] placeholder:text-gray-400'

  return (
    <div className="page">
      <button className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1" onClick={() => navigate('/contribute')}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Add Store</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Add a grocery store not yet in the database.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
          Store Name *
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SM Supermarket" />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
          Address
          <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Main St, Manila" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
            Latitude *
            <input className={inputCls} type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="14.5995" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
            Longitude *
            <input className={inputCls} type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="120.9842" />
          </label>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-light text-primary text-sm font-semibold rounded-sm hover:opacity-80 transition-opacity disabled:opacity-50"
          onClick={detectLocation}
          disabled={locating}
        >
          {locating ? <Loader size={16} className="animate-spin" /> : <MapPin size={16} />}
          {locating ? 'Detecting...' : 'Use My Current Location'}
        </button>

        {error && <p className="text-sm text-red font-medium">{error}</p>}

        <button
          type="submit"
          className="w-full px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Adding...' : 'Add Store'}
        </button>
      </form>
    </div>
  )
}
