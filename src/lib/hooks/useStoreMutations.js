/**
 * useStoreMutations — Mutation hooks for store operations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

// Create a new store
export function useCreateStore() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, address, latitude, longitude, userId }) => {
      const { data, error } = await supabase
        .from('stores')
        .insert({
          name: name.trim(),
          address: address?.trim() || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          created_by: userId,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate store-related queries
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['nearby-stores'] })
    },
    onError: (error) => {
      console.error('Failed to create store:', error)
    },
  })
}

// Update a store
export function useUpdateStore() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, name, address, latitude, longitude }) => {
      const { data, error } = await supabase
        .from('stores')
        .update({
          name: name.trim(),
          address: address?.trim() || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate store-related queries
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['store', data.id] })
      queryClient.invalidateQueries({ queryKey: ['nearby-stores'] })
    },
  })
}

// Delete a store (admin only)
export function useDeleteStore() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (storeId) => {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId)
      
      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate store-related queries
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['nearby-stores'] })
    },
  })
}