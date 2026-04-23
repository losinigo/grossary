/**
 * useMyConfirmations — Fetches the current user's confirm/deny votes
 * and returns them as a { [priceId]: boolean } map.
 *
 * @param {string | null} userId
 * @param {string}        cacheKey – unique suffix to avoid collisions between pages
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

export default function useMyConfirmations(userId, cacheKey = '') {
  return useQuery({
    queryKey: ['my-confirmations', cacheKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('confirmations')
        .select('price_id, confirmed')
        .eq('user_id', userId)
      return data
        ? Object.fromEntries(data.map((c) => [c.price_id, c.confirmed]))
        : {}
    },
    enabled: !!userId,
  })
}
