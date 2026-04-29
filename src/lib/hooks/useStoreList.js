/**
 * useStoreList — Fetches all stores ordered by name.
 * Used by AddPrice and ShoppingListDetail for store selection dropdowns.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

export default function useStoreList() {
  return useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name, address').order('name')
      return data || []
    },
  })
}
