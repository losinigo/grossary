import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

/**
 * Hook to get the current user's role and check permissions
 * Usage:
 *   const { role, isPremium, isAdmin, canUploadPhotos } = useUserRole()
 */
export function useUserRole() {
  const { user } = useAuth()

  const { data: userRole = 'free', isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'free'
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return data?.role || 'free'
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  return {
    role: userRole,
    isLoading,
    // Convenience checks
    isPremium: userRole === 'premium',
    isAdmin: userRole === 'admin',
    isFree: userRole === 'free',
    // Permission checks
    canUploadPhotos: ['premium', 'admin'].includes(userRole),
    canAddItems: ['free', 'premium', 'admin'].includes(userRole),
    canConfirmPrices: ['free', 'premium', 'admin'].includes(userRole),
    canModerate: ['admin'].includes(userRole),
  }
}
