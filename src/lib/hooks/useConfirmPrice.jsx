/**
 * useConfirmPrice — Mutation to confirm or deny a price entry.
 * Upserts into the `confirmations` table and invalidates related queries.
 *
 * @param {string} userId       – current user's id
 * @param {string[]} queryKeys  – extra query keys to invalidate on success
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

export default function useConfirmPrice(userId, queryKeys = []) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ priceId, confirmed }) => {
      const { error } = await supabase
        .from('confirmations')
        .upsert(
          { price_id: priceId, user_id: userId, confirmed },
          { onConflict: 'price_id,user_id' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
    },
    onError: () => alert('Failed to submit. Please try again.'),
  })
}
