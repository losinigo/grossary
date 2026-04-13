import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Loader, Store } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import './StoresPage.css'

export default function StoresPage() {
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const navigate = useNavigate()

  const { data: stores, isLoading } = useQuery({
    queryKey: ['nearby-stores', coords?.lat, coords?.lng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('nearby_stores', {
        user_lat: coords.lat,
        user_lon: coords.lng,
        radius_km: 25,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!coords,
  })

  const requestLocation = () => {
    if (!navigator.geolocation) return setLocError('Geolocation not supported on this device.')
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setLocError(err.code === 1 ? 'Location permission denied. Enable it in your browser settings.' : 'Could not get location. Try again.')
        setLocating(false)
      },
    )
  }

  if (!coords) {
    return (
      <div className="page">
        <h2 className="page-title">Nearby Stores</h2>
        <p className="page-subtitle">Grocery stores in your area.</p>
        <div className="empty-state">
          <div className="empty-icon-ring">
            <MapPin size={32} color="var(--color-primary)" />
          </div>
          <p className="empty-title">Enable location access</p>
          <p className="empty-subtitle">Allow location access to find grocery stores near you.</p>
          <button className="btn-primary" onClick={requestLocation} disabled={locating}>
            {locating ? <><Loader size={16} className="spin" /> Detecting...</> : 'Allow Location'}
          </button>
          {locError && <p className="loc-error">{locError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="page-title">Nearby Stores</h2>
      <p className="page-subtitle">
        <Navigation size={12} /> Within 25 km of your location
      </p>

      {isLoading && (
        <div className="empty-state">
          <Loader size={24} className="spin" color="var(--color-gray-400)" />
          <p className="empty-subtitle">Finding stores...</p>
        </div>
      )}

      {!isLoading && stores?.length === 0 && (
        <div className="empty-state">
          <Store size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="empty-title">No stores nearby</p>
          <p className="empty-subtitle">Be the first to add a grocery store in your area!</p>
        </div>
      )}

      {stores?.length > 0 && (
        <div className="store-list">
          {stores.map((s) => (
            <div key={s.id} className="store-card store-card-link" onClick={() => navigate(`/stores/${s.id}`)}>
              <div className="store-icon">
                <Store size={20} />
              </div>
              <div className="store-info">
                <span className="store-name">{s.name}</span>
                {s.address && <span className="store-address">{s.address}</span>}
              </div>
              <span className="store-distance">{s.distance_km} km</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
