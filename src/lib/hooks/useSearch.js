/**
 * useSearch — General search hooks (stores only now)
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

// Product search with location support
export function useProductSearch(searchTerm, coords) {
  return useQuery({
    queryKey: ['product-search', searchTerm, coords?.lat, coords?.lng],
    queryFn: async () => {
      if (!searchTerm?.trim()) return []

      if (coords) {
        const { data } = await supabase.rpc('search_products_nearby', {
          search_term: searchTerm,
          user_lat: coords.lat,
          user_lon: coords.lng,
          radius_km: 25
        })
        return data || []
      }

      const { data } = await supabase.rpc('search_products', { search_term: searchTerm })
      return (data || []).map(p => ({ ...p, product_id: p.id, product_name: p.name }))
    },
    enabled: Boolean(searchTerm && searchTerm.length > 0),
  })
}

export function useStoreSearch(searchTerm) {
  return useQuery({
    queryKey: ['search-stores', searchTerm],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, name, address')
        .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(5)
      return data || []
    },
    enabled: searchTerm.length > 0,
  })
}

