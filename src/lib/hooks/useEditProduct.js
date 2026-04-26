import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

/**
 * Hook to edit or delete a product (admin only)
 * Usage:
 *   const { updateProduct, deleteProduct, isPending } = useEditProduct()
 *   await updateProduct({ id, name, brand, barcode, image_url })
 *   await deleteProduct(id)
 */
export default function useEditProduct() {
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, brand, barcode, image_url }) => {
      const { error } = await supabase
        .from('products')
        .update({ name, brand, barcode, image_url })
        .eq('id', id)

      if (error) throw new Error(error.message)
      return { id, name, brand, barcode, image_url }
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['product', data.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw new Error(error.message)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  return {
    updateProduct: (data) => updateMutation.mutateAsync(data),
    deleteProduct: (id) => deleteMutation.mutateAsync(id),
    isPending: updateMutation.isPending || deleteMutation.isPending,
    updateError: updateMutation.error?.message,
    deleteError: deleteMutation.error?.message,
  }
}
