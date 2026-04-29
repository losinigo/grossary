/**
 * useStores — Centralized store data hooks
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

export function useStore(id) {
  return useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single()
      return data
    },
    enabled: !!id,
  })
}

export function useStoreProducts(storeId) {
  return useQuery({
    queryKey: ['store-products', storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('current_prices')
        .select(`
          id,
          price,
          is_available,
          created_at,
          product_id,
          products(name, brand, image_url)
        `)
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!storeId,
  })
}

export function useAllStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, name, address')
        .order('name')
      return data || []
    },
  })
}