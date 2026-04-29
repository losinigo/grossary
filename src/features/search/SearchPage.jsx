/**
 * SearchPage — Home page of the app.
 *
 * Lets users search for grocery products and stores via text or barcode scan.
 * When idle, shows recent searches and recently-updated prices.
 * When searching, shows matching products and stores.
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanBarcode, PlusCircle } from 'lucide-react'
import { useGeolocation, useRecentlyUpdatedProducts, useProductAverages, useProductSearch, useStoreSearch } from '../../lib/hooks'
import { BarcodeScanner, ModernProductCard, StoreCard, SectionTitle, EmptyState } from '../../components'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const navigate = useNavigate()
  const { coords, coordsRef, requestLocation } = useGeolocation()

  /* ── Queries ─────────────────────────────────────────────── */

  const { data: results, isLoading } = useProductSearch(searchTerm, coords)
  const { data: storeResults } = useStoreSearch(searchTerm)
  const { data: recentlyUpdated } = useRecentlyUpdatedProducts()
  const { data: avgPrices } = useProductAverages()

  /* ── Handlers ────────────────────────────────────────────── */

  const doSearch = async (term) => {
    if (!term.trim()) return
    await requestLocation()
    setSearchTerm(term.trim())
  }

  const handleSearch = (e) => { e?.preventDefault(); doSearch(query) }
  const handleScan = (code) => { setScanning(false); setScannedBarcode(code); setQuery(code); doSearch(code) }

  const handleProductClick = useCallback((r) => {
    navigate(`/product/${r.product_id}`)
  }, [navigate])

  /* ── Derived state ───────────────────────────────────────── */

  const hasProducts = results?.length > 0
  const hasStores = storeResults?.length > 0
  const noResults = searchTerm && !isLoading && !hasProducts && !hasStores
  const showIdle = !searchTerm && !isLoading

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="page">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Search</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">Search for the grocery prices nearby.</p>
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
                {recentlyUpdated.map((p, index) => (
                  <ModernProductCard
                    key={p.id}
                    data={p}
                    index={index}
                    avgPrices={avgPrices}
                    onClick={() => { navigate(`/product/${p.product_id}`) }}
                  />
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
              <ModernProductCard
                key={i}
                data={r}
                avgPrices={avgPrices}
                onClick={() => handleProductClick(r)}
              />
            ))}
          </div>
        </>
      )}

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
