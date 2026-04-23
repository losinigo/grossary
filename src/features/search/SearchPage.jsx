/**
 * SearchPage — Home page of the app.
 *
 * Lets users search for grocery products and stores via text or barcode scan.
 * When idle, shows recent searches and recently-updated prices.
 * When searching, shows matching products and stores.
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanBarcode, MapPin, Clock, PlusCircle, X } from 'lucide-react'
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
      const { data } = await supabase.from('prices').select('id, price, created_at, product_id, products(name, brand), stores(name)').order('created_at', { ascending: false }).limit(8)
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
          {recent.items.length > 0 && (
            <section className="mt-5">
              <SectionTitle>Recent Searches</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {recent.items.map((r) => (
                  <div key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[0.82rem] text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/product/${r.id}`)}>
                    <span className="max-w-[200px] truncate">{r.name}{r.brand ? ` (${r.brand})` : ''}</span>
                    <button className="flex items-center text-gray-400 hover:text-gray-900 transition-colors" onClick={(e) => handleRemoveRecent(e, r.id)}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <SectionTitle>Recently Updated</SectionTitle>
            {recentlyUpdated?.length > 0 ? (
              <div className="flex flex-col gap-2 mt-4">
                {recentlyUpdated.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { recent.add({ id: p.product_id, name: p.products?.name, brand: p.products?.brand }); navigate(`/product/${p.product_id}`) }}>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="text-[0.95rem] font-semibold block">{p.products?.name || 'Unknown'}</span>
                        {p.products?.brand && <span className="text-xs text-gray-500">{p.products.brand}</span>}
                      </div>
                      <span className="text-lg font-bold text-green whitespace-nowrap">₱{Number(p.price).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-3 mt-2">
                      {p.stores?.name && <span className={meta}><MapPin size={13} /> {p.stores.name}</span>}
                      <span className={meta}><Clock size={13} /> {timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                ))}
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
