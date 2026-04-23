/**
 * ConfirmPrice — Lets users search for a product and confirm or deny
 * its current reported prices at various stores.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import useProductSearch from '../../lib/hooks/useProductSearch'
import useConfirmPrice from '../../lib/hooks/useConfirmPrice'
import useMyConfirmations from '../../lib/hooks/useMyConfirmations'
import BackButton from '../../components/ui/BackButton'
import PriceCard from '../../components/ui/PriceCard'
import ProductSearchInput from '../../components/ui/ProductSearchInput'

export default function ConfirmPrice() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [productSearch, setProductSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [productDisplay, setProductDisplay] = useState('')

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: products } = useProductSearch(productSearch, { fields: 'id, name, brand' })

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['current-prices', productId],
    queryFn: async () => {
      const { data } = await supabase.from('current_prices').select('id, price, is_available, created_at, confirmation_count, store_id, user_id, contributor_name').eq('product_id', productId)
      if (!data?.length) return []
      const storeIds = [...new Set(data.map((p) => p.store_id))]
      const { data: stores } = await supabase.from('stores').select('id, name, address').in('id', storeIds)
      const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s]))
      return data.map((p) => ({ ...p, store: storeMap[p.store_id] }))
    },
    enabled: !!productId,
  })

  const { data: myConfirmations } = useMyConfirmations(user?.id, `cp-${productId}`)

  const confirmMutation = useConfirmPrice(user?.id, [
    ['current-prices', productId],
    ['my-confirmations', `cp-${productId}`],
  ])

  /* ── Handlers ────────────────────────────────────────────── */

  const handleProductChange = (val) => {
    setProductSearch(val)
    setProductId('')
    setProductDisplay('')
  }

  const handleProductSelect = (p) => {
    setProductId(p.id)
    setProductDisplay(`${p.name}${p.brand ? ` (${p.brand})` : ''}`)
    setProductSearch('')
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="page">
      <BackButton onClick={() => navigate('/contribute')} />
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Confirm Price</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Verify that an existing price is still accurate.</p>

      <div className="flex flex-col gap-4">
        <ProductSearchInput
          value={productId ? productDisplay : productSearch}
          onChange={handleProductChange}
          onSelect={handleProductSelect}
          results={products || []}
          showDropdown={!productId}
        />
      </div>

      {productId && pricesLoading && <p className="text-center py-10 text-gray-500 text-sm">Loading prices...</p>}
      {productId && !pricesLoading && prices?.length === 0 && <p className="text-center py-10 text-gray-500 text-sm">No prices found for this product.</p>}

      {prices?.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-4">
          {prices.map((p) => (
            <PriceCard
              key={p.id}
              price={p}
              myConfirmations={myConfirmations}
              currentUserId={user?.id}
              onConfirm={confirmMutation.mutate}
              onDeny={confirmMutation.mutate}
              isPending={confirmMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
