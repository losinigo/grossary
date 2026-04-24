/**
 * ProductDetail — Shows a product's info, current prices at different stores,
 * and full price history. Users can confirm or deny reported prices.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import useConfirmPrice from '../../lib/hooks/useConfirmPrice'
import useMyConfirmations from '../../lib/hooks/useMyConfirmations'
import BackButton from '../../components/ui/BackButton'
import SectionTitle from '../../components/ui/SectionTitle'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).single()
      return data
    },
  })

  const { data: currentPrices } = useQuery({
    queryKey: ['product-prices', id],
    queryFn: async () => {
      const { data } = await supabase.from('current_prices').select('id, price, is_available, created_at, confirmation_count, store_id, user_id, contributor_name, contributor_avatar_url').eq('product_id', id)
      if (!data?.length) return []
      const storeIds = [...new Set(data.map((p) => p.store_id))]
      const { data: stores } = await supabase.from('stores').select('id, name, address').in('id', storeIds)
      const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s]))
      return data.map((p) => ({ ...p, store: storeMap[p.store_id] }))
    },
    enabled: !!id,
  })

  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', id],
    queryFn: async () => {
      const { data } = await supabase.from('prices').select('id, price, created_at, is_available, stores(name), profiles:user_id(display_name, avatar_url)').eq('product_id', id).order('created_at', { ascending: false }).limit(20)
      return data || []
    },
    enabled: !!id,
  })

  const { data: myConfirmations } = useMyConfirmations(user?.id, id)

  const confirmMutation = useConfirmPrice(user?.id, [
    ['product-prices', id],
    ['my-confirmations', id],
  ])

  /* ── Render ──────────────────────────────────────────────── */

  if (productLoading) return <div className="page"><p>Loading...</p></div>
  if (!product) return <div className="page"><p>Product not found.</p></div>

  return (
    <div className="page">
      <BackButton onClick={() => navigate(-1)} />

      {/* Product info */}
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-56 w-full rounded-md bg-gray-100 object-cover"
        />
      ) : (
        <div className="flex h-56 w-full items-center justify-center rounded-md bg-gray-100 text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon size={28} />
            <span className="text-sm font-medium">No product photo yet</span>
          </div>
        </div>
      )}
      <div>
        <SectionTitle>{product.name}</SectionTitle>
        {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
      </div>


      {/* Current prices */}


      {/* Price history */}

    </div>
  )
}
