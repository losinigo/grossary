/**
 * useProduct — Product-related hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

// Single product
export function useProduct(id) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      return data
    },
    enabled: !!id,
  })
}

// Multiple products with options
export function useProducts(options = {}) {
  const {
    limit,
    offset = 0,
    orderBy = 'name',
    ascending = true,
    category,
    brand,
    search,
    select = '*'
  } = options

  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(select)

      // Add filters
      if (category) {
        query = query.eq('category', category)
      }
      if (brand) {
        query = query.eq('brand', brand)
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`)
      }

      // Add ordering
      query = query.order(orderBy, { ascending })

      // Add pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset > 0) {
        query = query.range(offset, offset + (limit || 1000) - 1)
      }

      const { data } = await query
      return data || []
    },
  })
}

// Recently updated products
export function useRecentlyUpdatedProducts() {
  return useQuery({
    queryKey: ['recently-updated-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prices')
        .select(`
          id, 
          price, 
          created_at, 
          product_id,
          products(name, brand, image_url),
          stores(name)
        `)
        .order('created_at', { ascending: false })
        .limit(8)
      return data || []
    },
  })
}

// Product averages
export function useProductAverages() {
  return useQuery({
    queryKey: ['product-averages'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_product_averages')
      return data || []
    },
  })
}

// Product prices
export function useProductPrices(productId) {
  return useQuery({
    queryKey: ['product-prices', productId],
    queryFn: async () => {
      const { data } = await supabase
        .from('current_prices')
        .select('id, price, is_available, created_at, confirmation_count, store_id, user_id, contributor_name, contributor_avatar_url')
        .eq('product_id', productId)

      if (!data?.length) return []

      const storeIds = [...new Set(data.map(p => p.store_id))]
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name, address')
        .in('id', storeIds)

      const storeMap = Object.fromEntries((stores || []).map(s => [s.id, s]))
      return data.map(p => ({ ...p, store: storeMap[p.store_id] }))
    },
    enabled: !!productId,
  })
}

// Product price history
export function useProductHistory(productId, limit = 20) {
  return useQuery({
    queryKey: ['product-history', productId, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('prices')
        .select('id, price, created_at, is_available, stores(name), profiles:user_id(display_name, avatar_url)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(limit)
      return data || []
    },
    enabled: !!productId,
  })
  
}

/**
 * useProductConfirmations — Fetches the current user's confirm/deny votes
 * and returns them as a { [priceId]: boolean } map.
 *
 * @param {string | null} userId
 * @param {string}        cacheKey – unique suffix to avoid collisions between pages
 */

export function useProductConfirmations(userId, cacheKey = '') {
  return useQuery({
    queryKey: ['product-confirmations', cacheKey],
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
// === MUTATIONS ===

// Create a new product
export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, brand, barcode, category, userId }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          brand: brand?.trim() || null,
          barcode: barcode?.trim() || null,
          category: category?.trim() || null,
          created_by: userId,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// Update a product
export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, name, brand, barcode, category, image_url }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: name.trim(),
          brand: brand?.trim() || null,
          barcode: barcode?.trim() || null,
          category: category?.trim() || null,
          image_url: image_url || null,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', data.id] })
    },
  })
}

// Delete a product (admin only)
export function useDeleteProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (productId) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

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
      queryClient.invalidateQueries({ queryKey: ['product-prices', data.product_id] })
      queryClient.invalidateQueries({ queryKey: ['product-history', data.product_id] })
    },
  })
}