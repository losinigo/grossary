import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Loader, Store } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

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
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Nearby Stores</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Grocery stores in your area.</p>
        <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
            <MapPin size={32} color="var(--color-primary)" />
          </div>
          <p className="text-base font-semibold text-gray-900 mt-2">Enable location access</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Allow location access to find grocery stores near you.</p>
          <button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity disabled:opacity-50" onClick={requestLocation} disabled={locating}>
            {locating ? <><Loader size={16} className="animate-spin" /> Detecting...</> : 'Allow Location'}
          </button>
          {locError && <p className="text-sm text-red font-medium mt-1">{locError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Nearby Stores</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5 inline-flex items-center gap-1">
        <Navigation size={12} /> Within 25 km of your location
      </p>

      {isLoading && (
        <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
          <Loader size={24} className="animate-spin" color="var(--color-gray-400)" />
          <p className="text-sm text-gray-500">Finding stores...</p>
        </div>
      )}

      {!isLoading && stores?.length === 0 && (
        <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
          <Store size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="text-base font-semibold text-gray-900 mt-2">No stores nearby</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Be the first to add a grocery store in your area!</p>
        </div>
      )}

      {stores?.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/stores/${s.id}`)}>
              <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-gray-100 text-gray-500 shrink-0">
                <Store size={20} />
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-[0.95rem] font-semibold">{s.name}</span>
                {s.address && <span className="text-xs text-gray-500 truncate">{s.address}</span>}
              </div>
              <span className="text-sm font-semibold text-primary whitespace-nowrap">{s.distance_km} km</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
