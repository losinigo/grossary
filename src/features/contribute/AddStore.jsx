import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import './Forms.css'

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

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/contribute')}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="page-title">Add Store</h2>
      <p className="page-subtitle">Add a grocery store not yet in the database.</p>

      <form className="form" onSubmit={handleSubmit}>
        <label className="form-label">
          Store Name *
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SM Supermarket" />
        </label>

        <label className="form-label">
          Address
          <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Main St, Manila" />
        </label>

        <div className="form-row">
          <label className="form-label">
            Latitude *
            <input className="form-input" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="14.5995" />
          </label>
          <label className="form-label">
            Longitude *
            <input className="form-input" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="120.9842" />
          </label>
        </div>

        <button type="button" className="btn-secondary" onClick={detectLocation} disabled={locating}>
          {locating ? <Loader size={16} className="spin" /> : <MapPin size={16} />}
          {locating ? 'Detecting...' : 'Use My Current Location'}
        </button>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary btn-full" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Store'}
        </button>
      </form>
    </div>
  )
}
