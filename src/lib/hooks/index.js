/**
 * Data Hooks Index — Centralized exports for all data fetching hooks
 */

// Product hooks
export {
  useProduct,
  useProducts,
  useProductPrices,
  useProductHistory,
  useRecentlyUpdatedProducts,
  useProductAverages,
  useProductConfirmations,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreatePrice,
  useUpdatePriceAvailability
} from './useProduct'

// Store hooks
export { useStore, useStoreProducts, useAllStores } from './useStores'

// Search hooks  
export {
  useProductSearch,
  useStoreSearch
} from './useSearch'

// Existing hooks
export { AuthProvider, useAuth } from './useAuth'
export { default as useGeolocation } from './useGeolocation'
export { default as useConfirmPrice } from './useConfirmPrice'
export { default as useUserRole } from './useUserRole'
export { default as useEditProduct } from './useEditProduct'
export { default as useStoreList } from './useStoreList'

// Mutation hooks
export { useCreateStore, useUpdateStore, useDeleteStore } from './useStoreMutations'