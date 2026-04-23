/**
 * useNearbyStores — Fetches stores within a radius of the given coordinates
 * via the `nearby_stores` Supabase RPC.
 *
 * @param {{ lat: number, lng: number } | null} coords
 * @param {number} [radiusKm=25]
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

export default function useNearbyStores(coords, radiusKm = 25) {
  return useQuery({
    queryKey: ['nearby-stores', coords?.lat, coords?.lng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('nearby_stores', {
        user_lat: coords.lat,
        user_lon: coords.lng,
        radius_km: radiusKm,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!coords,
  })
}
