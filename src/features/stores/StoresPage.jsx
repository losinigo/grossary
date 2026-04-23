/**
 * StoresPage — Lists grocery stores near the user's location.
 * Requires geolocation permission before fetching results.
 */
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Loader, Store } from 'lucide-react'
import useGeolocation from '../../lib/hooks/useGeolocation'
import useNearbyStores from '../../lib/hooks/useNearbyStores'
import StoreCard from '../../components/ui/StoreCard'
import EmptyState from '../../components/ui/EmptyState'

export default function StoresPage() {
  const navigate = useNavigate()
  const { coords, locating, error: locError, requestLocation } = useGeolocation()
  const { data: stores, isLoading } = useNearbyStores(coords)

  /* ── Location gate ───────────────────────────────────────── */

  if (!coords) {
    return (
      <div className="page">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Nearby Stores</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Grocery stores in your area.</p>
        <EmptyState
          icon={<div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center"><MapPin size={32} color="var(--color-primary)" /></div>}
          title="Enable location access"
          message="Allow location access to find grocery stores near you."
          action={
            <>
              <button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity disabled:opacity-50" onClick={requestLocation} disabled={locating}>
                {locating ? <><Loader size={16} className="animate-spin" /> Detecting...</> : 'Allow Location'}
              </button>
              {locError && <p className="text-sm text-red font-medium mt-1">{locError}</p>}
            </>
          }
        />
      </div>
    )
  }

  /* ── Main render ─────────────────────────────────────────── */

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
        <EmptyState
          icon={<Store size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="No stores nearby"
          message="Be the first to add a grocery store in your area!"
        />
      )}

      {stores?.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {stores.map((s) => (
            <StoreCard key={s.id} store={s} onClick={() => navigate(`/stores/${s.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
