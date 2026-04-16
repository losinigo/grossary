import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanBarcode, MapPin, Clock, Users, PlusCircle, Store, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'
import BarcodeScanner from '../../components/BarcodeScanner'

const RECENT_KEY = 'grossary_recent_searches'
const MAX_RECENT = 5

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || [] } catch { return [] }
}
function addRecent(item) {
  const list = getRecent().filter((r) => r.id !== item.id)
  list.unshift(item)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
}
function removeRecent(id) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter((r) => r.id !== id)))
}

const meta = 'inline-flex items-center gap-1 text-xs text-gray-500'
const card = 'bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors'
const sectionTitle = 'text-[0.82rem] font-semibold text-gray-500 uppercase tracking-wide mb-2.5'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [coords, setCoords] = useState(null)
  const [recentItems, setRecentItems] = useState(getRecent)
  const coordsRef = useRef(null)
  const navigate = useNavigate()

  const requestLocation = () => new Promise((resolve) => {
    if (coordsRef.current) return resolve(coordsRef.current)
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => { const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }; coordsRef.current = c; setCoords(c); resolve(c) },
      () => resolve(null),
    )
  })

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

  const doSearch = async (term) => { if (!term.trim()) return; await requestLocation(); setSearchTerm(term.trim()) }
  const handleSearch = (e) => { e?.preventDefault(); doSearch(query) }
  const handleScan = (code) => { setScanning(false); setScannedBarcode(code); setQuery(code); doSearch(code) }

  const handleProductClick = useCallback((r) => {
    addRecent({ id: r.product_id, name: r.product_name, brand: r.brand })
    setRecentItems(getRecent())
    navigate(`/product/${r.product_id}`)
  }, [navigate])

  const handleRemoveRecent = useCallback((e, id) => {
    e.stopPropagation(); removeRecent(id); setRecentItems(getRecent())
  }, [])

  const hasProducts = results?.length > 0
  const hasStores = storeResults?.length > 0
  const noResults = searchTerm && !isLoading && !hasProducts && !hasStores
  const showIdle = !searchTerm && !isLoading

  return (
    <div className="page">
      <form className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-4 py-2.5 shadow-sm" onSubmit={handleSearch}>
        <Search size={18} color="var(--color-gray-400)" />
        <input type="text" className="flex-1 border-none outline-none text-[0.95rem] bg-transparent text-gray-900 placeholder:text-gray-400" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search groceries or stores..." />
        <button type="button" className="flex items-center justify-center text-primary p-1 rounded-sm hover:bg-primary-light transition-colors" onClick={() => setScanning(true)} aria-label="Scan barcode">
          <ScanBarcode size={20} />
        </button>
      </form>

      {showIdle && (
        <>
          {recentItems.length > 0 && (
            <section className="mt-5">
              <h3 className={sectionTitle}>Recent Searches</h3>
              <div className="flex flex-wrap gap-2">
                {recentItems.map((r) => (
                  <div key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[0.82rem] text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/product/${r.id}`)}>
                    <span className="max-w-[200px] truncate">{r.name}{r.brand ? ` (${r.brand})` : ''}</span>
                    <button className="flex items-center text-gray-400 hover:text-gray-900 transition-colors" onClick={(e) => handleRemoveRecent(e, r.id)}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <h3 className={sectionTitle}>Recently Updated</h3>
            {recentlyUpdated?.length > 0 ? (
              <div className="flex flex-col gap-2 mt-4">
                {recentlyUpdated.map((p) => (
                  <div key={p.id} className={card} onClick={() => { addRecent({ id: p.product_id, name: p.products?.name, brand: p.products?.brand }); setRecentItems(getRecent()); navigate(`/product/${p.product_id}`) }}>
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
        <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
          <p className="text-base font-semibold text-gray-900 mt-2">No results found</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Try a different search term, or be the first to add this item!</p>
          {scannedBarcode && (
            <button className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full" onClick={() => navigate('/contribute/item', { state: { barcode: scannedBarcode } })}>
              <PlusCircle size={18} /> Add Item
            </button>
          )}
        </div>
      )}

      {hasStores && (
        <>
          {hasProducts && <h3 className={`${sectionTitle} mt-4 -mb-1`}>Stores</h3>}
          <div className="flex flex-col gap-2 mt-4">
            {storeResults.map((s) => (
              <div key={s.id} className={`${card} flex items-center gap-3`} onClick={() => navigate(`/stores/${s.id}`)}>
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-gray-100 text-gray-500 shrink-0"><Store size={18} /></div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[0.95rem] font-semibold">{s.name}</span>
                  {s.address && <span className={meta}><MapPin size={13} /> {s.address}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hasProducts && (
        <>
          {hasStores && <h3 className={`${sectionTitle} mt-4 -mb-1`}>Products</h3>}
          <div className="flex flex-col gap-2 mt-4">
            {results.map((r, i) => (
              <div key={i} className={card} onClick={() => handleProductClick(r)}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[0.95rem] font-semibold block">{r.product_name}</span>
                    {r.brand && <span className="text-xs text-gray-500">{r.brand}</span>}
                    {r.unit_type !== 'piece' && <span className="text-xs text-primary font-medium ml-1.5">per {r.unit_abbreviation}</span>}
                  </div>
                  {r.price != null && (
                    <div className="flex flex-col items-end gap-0.5">
                      {r.unit_type !== 'piece' ? (
                        <>
                          <span className="text-lg font-bold text-green whitespace-nowrap">₱{Number(r.price_per_unit).toFixed(2)}/{r.unit_abbreviation}</span>
                          {r.unit_quantity !== 1 && <span className="text-xs text-gray-500 whitespace-nowrap">₱{Number(r.price).toFixed(2)} for {r.unit_quantity}{r.unit_abbreviation}</span>}
                        </>
                      ) : (
                        <span className="text-lg font-bold text-green whitespace-nowrap">₱{Number(r.price).toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
                {r.store_name && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className={meta}><MapPin size={13} /> {r.store_name}{r.distance_km != null && ` · ${r.distance_km} km`}</span>
                  </div>
                )}
                <div className="flex items-center flex-wrap gap-3 mt-2">
                  {r.contributor_name && <span className={meta}><Avatar src={r.contributor_avatar_url} size={18} />{r.contributor_name}</span>}
                  {r.price_updated_at && <span className={meta}><Clock size={13} /> {timeAgo(r.price_updated_at)}</span>}
                  {r.confirmation_count >= 0 && <span className={`${meta} ${r.confirmation_count > 0 ? '!text-green !font-medium' : ''}`}><Users size={13} /> {r.confirmation_count} confirmed</span>}
                </div>
                {r.is_available === false && <span className="inline-block mt-2 text-xs font-medium text-red bg-red-light px-2 py-0.5 rounded-full">Marked unavailable</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
