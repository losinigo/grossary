/**
 * usePriceMutations — Mutation hooks for price operations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

// Add a new price
export function useCreatePrice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ productId, storeId, price, userId, isAvailable = true, proofImageUrl = null }) => {
      const { data, error } = await supabase
        .from('prices')
        .insert({
          product_id: productId,
          store_id: storeId,
          price: parseFloat(price),
          user_id: userId,
          is_available: isAvailable,
          proof_image_url: proofImageUrl,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate price-related queries
      queryClient.invalidateQueries({ queryKey: ['product-prices', data.product_id] })
      queryClient.invalidateQueries({ queryKey: ['product-history', data.product_id] })
      queryClient.invalidateQueries({ queryKey: ['recently-updated-products'] })
      queryClient.invalidateQueries({ queryKey: ['store-products', data.store_id] })
    },
  })
}

// Update price availability
export function useUpdatePriceAvailability() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ priceId, isAvailable }) => {
      const { data, error } = await supabase
        .from('prices')
        .update({ is_available: isAvailable })
        .eq('id', priceId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate price-related queries
      queryClient.invalidateQueries({ queryKey: ['product-prices', data.product_id] })
      queryClient.invalidateQueries({ queryKey: ['product-history', data.product_id] })
    },
  })
}