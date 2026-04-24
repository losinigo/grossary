/**
 * SearchPage — Home page of the app.
 *
 * Lets users search for grocery products and stores via text or barcode scan.
 * When idle, shows recent searches and recently-updated prices.
 * When searching, shows matching products and stores.
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanBarcode, MapPin, Clock, PlusCircle, X, TrendingDown, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/utils'
import useGeolocation from '../../lib/hooks/useGeolocation'
import useRecentSearches from '../../lib/hooks/useRecentSearches'
import BarcodeScanner from '../../components/BarcodeScanner'
import ProductCard from '../../components/ui/ProductCard'
import StoreCard from '../../components/ui/StoreCard'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'

const meta = 'inline-flex items-center gap-1 text-xs text-gray-500'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const navigate = useNavigate()
  const { coords, coordsRef, requestLocation } = useGeolocation()
  const recent = useRecentSearches()

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', searchTerm, coords?.lat, coords?.lng],
    queryFn: async () => {
      const loc = coordsRef.current
      if (loc) {
        const { data } = await supabase.rpc('search_products_nearby', { search_term: searchTerm, user_lat: loc.lat, user_lon: loc.lng, radius_km: 25 })
        return data || []
      }
      const { data } = await supabase.rpc('search_products', { search_term: searchTerm })
      return (data || []).map((p) => ({ ...p, product_id: p.id, product_name: p.name }))
    },
    enabled: searchTerm.length > 0,
  })

  const { data: storeResults } = useQuery({
    queryKey: ['search-stores', searchTerm],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name, address').or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`).limit(5)
      return data || []
    },
    enabled: searchTerm.length > 0,
  })

  const { data: recentlyUpdated } = useQuery({
    queryKey: ['recently-updated'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prices')
        .select(`
          id, 
          price, 
          created_at, 
          product_id,
          products(name, brand),
          stores(name)
        `)
        .order('created_at', { ascending: false })
        .limit(8)
      return data || []
    },
  })

  // Get average prices for comparison
  const { data: avgPrices } = useQuery({
    queryKey: ['avg-prices'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_product_averages')
      return data || []
    },
  })

  /* ── Handlers ────────────────────────────────────────────── */

  const doSearch = async (term) => {
    if (!term.trim()) return
    await requestLocation()
    setSearchTerm(term.trim())
  }

  const handleSearch = (e) => { e?.preventDefault(); doSearch(query) }
  const handleScan = (code) => { setScanning(false); setScannedBarcode(code); setQuery(code); doSearch(code) }

  const handleProductClick = useCallback((r) => {
    recent.add({ id: r.product_id, name: r.product_name, brand: r.brand })
    navigate(`/product/${r.product_id}`)
  }, [navigate, recent])

  const handleRemoveRecent = useCallback((e, id) => {
    e.stopPropagation()
    recent.remove(id)
  }, [recent])

  /* ── Derived state ───────────────────────────────────────── */

  const hasProducts = results?.length > 0
  const hasStores = storeResults?.length > 0
  const noResults = searchTerm && !isLoading && !hasProducts && !hasStores
  const showIdle = !searchTerm && !isLoading

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="page">
      {/* Search bar */}
      <form className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-md px-4 py-2.5 shadow-sm" onSubmit={handleSearch}>
        <Search size={18} color="var(--color-gray-400)" />
        <input type="text" className="flex-1 border-none outline-none text-[0.95rem] bg-transparent text-gray-900 placeholder:text-gray-400" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search groceries or stores..." />
        <button type="button" className="flex items-center justify-center text-primary p-1 rounded-sm hover:bg-primary-light transition-colors" onClick={() => setScanning(true)} aria-label="Scan barcode">
          <ScanBarcode size={20} />
        </button>
      </form>

      {/* Idle state — recent searches + recently updated */}
      {showIdle && (
        <>
          <section className="mt-5">
            <SectionTitle>Recently Updated</SectionTitle>
            {recentlyUpdated?.length > 0 ? (
              <div className="flex flex-col gap-2 mt-4">
                {recentlyUpdated.map((p) => {
                  // Calculate price comparison
                  const currentPrice = Number(p.price)
                  const avgData = avgPrices?.find(avg => avg.product_id === p.product_id)
                  const avgPrice = avgData ? Number(avgData.avg_price) : 0
                  const hasComparison = avgPrice && avgPrice > 0
                  const priceDiff = hasComparison ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0
                  const isLower = priceDiff < 0
                  const isHigher = priceDiff > 0
                  
                  return (
                    <div key={p.id} className="bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { recent.add({ id: p.product_id, name: p.products?.name, brand: p.products?.brand }); navigate(`/product/${p.product_id}`) }}>
                      <div className="flex gap-3 items-center">
                        {/* Image Placeholder */}
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500 shrink-0">
                          IMG
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          {/* Product Name */}
                          <div className="flex items-center gap-1 min-w-0">
                            {/* Product Name (truncates) */}
                            <div className="truncate min-w-0">
                              <span className="text-sm text-black font-semibold">
                                {p.products?.name}
                              </span>
                            </div>

                            {/* Brand (always visible) */}
                            {p.products?.brand && (
                              <span className="text-sm text-gray-500 shrink-0 ml-1">
                                ({p.products?.brand})
                              </span>
                            )}
                          </div>

                          {/* Price */}
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-bold text-blue-500">
                              ₱{currentPrice.toFixed(2)}
                            </span>

                            {hasComparison && (
                              <>
                                <span className="text-xs text-gray-400">
                                  ~ ₱{avgPrice.toFixed(2)}
                                </span>

                                {(isLower || isHigher) && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                    isLower 
                                      ? 'bg-red-50 text-red-600' 
                                      : 'bg-green-50 text-green-600'
                                  }`}>
                                    {Math.abs(priceDiff).toFixed(0)}%
                                    {isLower ? (
                                      <TrendingDown className="w-3 h-3" />
                                    ) : (
                                      <TrendingUp className="w-3 h-3" />
                                    )}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Available Locations */}
                          <span className="text-xs text-gray-500 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[0.72rem] text-gray-400">
                              <MapPin size={11} />{p.stores?.name ? p.stores.name : 'Location info unavailable'}
                              <Clock size={11} className="ml-2" />{timeAgo(p.created_at)}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center py-6 text-gray-400 text-sm">No price updates yet.</p>
            )}
          </section>
        </>
      )}

      {isLoading && <p className="text-center py-10 text-gray-500 text-sm">Searching...</p>}

      {noResults && (
        <EmptyState
          title="No results found"
          message="Try a different search term, or be the first to add this item!"
          action={scannedBarcode && (
            <button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full" onClick={() => navigate('/contribute/item', { state: { barcode: scannedBarcode } })}>
              <PlusCircle size={18} /> Add Item
            </button>
          )}
        />
      )}

      {/* Store results */}
      {hasStores && (
        <>
          {hasProducts && <SectionTitle className="mt-4 -mb-1">Stores</SectionTitle>}
          <div className="flex flex-col gap-2 mt-4">
            {storeResults.map((s) => (
              <StoreCard key={s.id} store={s} onClick={() => navigate(`/stores/${s.id}`)} />
            ))}
          </div>
        </>
      )}

      {/* Product results */}
      {hasProducts && (
        <>
          {hasStores && <SectionTitle className="mt-4 -mb-1">Products</SectionTitle>}
          <div className="flex flex-col gap-2 mt-4">
            {results.map((r, i) => (
              <ProductCard key={i} data={r} onClick={() => handleProductClick(r)} />
            ))}
          </div>
        </>
      )}

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
