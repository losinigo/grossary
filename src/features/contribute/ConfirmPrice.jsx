/**
 * ConfirmPrice — Lets users search for a product and confirm or deny
 * its current reported prices at various stores.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth, useUserRole, useProductSearch, useConfirmPrice, useProductConfirmations } from '../../lib/hooks'
import { BackButton, PriceCard, ProductSearchInput, EmptyState } from '../../components'

export default function ConfirmPrice() {
  const { user } = useAuth()
  const { canConfirmPrices, isLoading: roleLoading } = useUserRole()
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

  const { data: myConfirmations } = useProductConfirmations(user?.id, `cp-${productId}`)

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
  if (roleLoading) return <div className="page"><p>Loading...</p></div>

  if (!canConfirmPrices) {
    return (
      <div className="page">
        <BackButton onClick={() => navigate('/contribute')} />
        <EmptyState
          icon={<Lock size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="Sign in to confirm prices"
          message="Only logged-in users can verify grocery prices."
          action={<button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity" onClick={() => navigate('/contribute')}>Go Back</button>}
        />
      </div>
    )
  }


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
