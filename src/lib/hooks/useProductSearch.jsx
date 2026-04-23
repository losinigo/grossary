/**
 * useProductSearch — Fuzzy product search by name, brand, or barcode.
 *
 * @param {string} searchTerm – the user's input (min 2 chars to fire)
 * @param {object} [options]
 * @param {string[]} [options.fields] – columns to select (defaults to id, name, brand + unit cols)
 * @returns {{ data, isLoading }} from useQuery
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

const DEFAULT_FIELDS = 'id, name, brand, unit_type, unit_name, unit_abbreviation'

export default function useProductSearch(searchTerm, { fields = DEFAULT_FIELDS } = {}) {
  return useQuery({
    queryKey: ['products-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return []
      const { data } = await supabase
        .from('products')
        .select(fields)
        .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,barcode.eq.${searchTerm}`)
        .limit(10)
      return data || []
    },
    enabled: searchTerm.length > 1,
  })
}
