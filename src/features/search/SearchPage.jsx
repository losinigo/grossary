import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanBarcode, MapPin, Clock, Users, PlusCircle, Store, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/utils'
import Avatar from '../../components/Avatar'
import BarcodeScanner from '../../components/BarcodeScanner'
import './SearchPage.css'

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
  const list = getRecent().filter((r) => r.id !== id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [coords, setCoords] = useState(null)
  const [recentItems, setRecentItems] = useState(getRecent)
  const coordsRef = useRef(null)
  const navigate = useNavigate()

  const requestLocation = () => {
    return new Promise((resolve) => {
      if (coordsRef.current) return resolve(coordsRef.current)
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          coordsRef.current = c
          setCoords(c)
          resolve(c)
        },
        () => resolve(null),
      )
    })
  }

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', searchTerm, coords?.lat, coords?.lng],
    queryFn: async () => {
      const loc = coordsRef.current
      if (loc) {
        const { data } = await supabase.rpc('search_products_nearby', {
          search_term: searchTerm,
          user_lat: loc.lat,
          user_lon: loc.lng,
          radius_km: 25,
        })
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
      const { data } = await supabase
        .from('stores')
        .select('id, name, address')
        .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(5)
      return data || []
    },
    enabled: searchTerm.length > 0,
  })

  const { data: recentlyUpdated } = useQuery({
    queryKey: ['recently-updated'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prices')
        .select('id, price, created_at, product_id, products(name, brand), stores(name)')
        .order('created_at', { ascending: false })
        .limit(8)
      return data || []
    },
  })

  const doSearch = async (term) => {
    if (!term.trim()) return
    await requestLocation()
    setSearchTerm(term.trim())
  }

  const handleSearch = (e) => {
    e?.preventDefault()
    doSearch(query)
  }

  const handleScan = (code) => {
    setScanning(false)
    setScannedBarcode(code)
    setQuery(code)
    doSearch(code)
  }

  const handleProductClick = useCallback((r) => {
    addRecent({ id: r.product_id, name: r.product_name, brand: r.brand })
    setRecentItems(getRecent())
    navigate(`/product/${r.product_id}`)
  }, [navigate])

  const handleRemoveRecent = useCallback((e, id) => {
    e.stopPropagation()
    removeRecent(id)
    setRecentItems(getRecent())
  }, [])

  const hasProducts = results?.length > 0
  const hasStores = storeResults?.length > 0
  const noResults = searchTerm && !isLoading && !hasProducts && !hasStores
  const showIdle = !searchTerm && !isLoading

  return (
    <div className="page">
      <form className="search-bar" onSubmit={handleSearch}>
        <Search size={18} color="var(--color-gray-400)" />
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groceries or stores..."
        />
        <button type="button" className="scan-btn" onClick={() => setScanning(true)} aria-label="Scan barcode">
          <ScanBarcode size={20} />
        </button>
      </form>

      {showIdle && (
        <>
          {recentItems.length > 0 && (
            <section className="home-section">
              <h3 className="home-section-title">Recent Searches</h3>
              <div className="recent-list">
                {recentItems.map((r) => (
                  <div key={r.id} className="recent-chip" onClick={() => navigate(`/product/${r.id}`)}>
                    <span className="recent-chip-text">{r.name}{r.brand ? ` (${r.brand})` : ''}</span>
                    <button className="recent-chip-remove" onClick={(e) => handleRemoveRecent(e, r.id)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="home-section">
            <h3 className="home-section-title">Recently Updated</h3>
            {recentlyUpdated?.length > 0 ? (
              <div className="results-list">
                {recentlyUpdated.map((p) => (
                  <div key={p.id} className="result-card result-card-link" onClick={() => { addRecent({ id: p.product_id, name: p.products?.name, brand: p.products?.brand }); setRecentItems(getRecent()); navigate(`/product/${p.product_id}`) }}>
                    <div className="result-header">
                      <div>
                        <span className="result-name">{p.products?.name || 'Unknown'}</span>
                        {p.products?.brand && <span className="result-brand">{p.products.brand}</span>}
                      </div>
                      <span className="result-price">₱{Number(p.price).toFixed(2)}</span>
                    </div>
                    <div className="result-footer">
                      {p.stores?.name && (
                        <span className="result-meta-item">
                          <MapPin size={13} /> {p.stores.name}
                        </span>
                      )}
                      <span className="result-meta-item">
                        <Clock size={13} /> {timeAgo(p.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="home-empty">No price updates yet.</p>
            )}
          </section>
        </>
      )}

      {isLoading && <p className="search-status">Searching...</p>}

      {noResults && (
        <div className="empty-state">
          <p className="empty-title">No results found</p>
          <p className="empty-subtitle">Try a different search term, or be the first to add this item!</p>
          {scannedBarcode && (
            <button
              className="btn-primary"
              onClick={() => navigate('/contribute/item', { state: { barcode: scannedBarcode } })}
            >
              <PlusCircle size={18} /> Add Item
            </button>
          )}
        </div>
      )}

      {hasStores && (
        <>
          {hasProducts && <h3 className="results-section-title">Stores</h3>}
          <div className="results-list">
            {storeResults.map((s) => (
              <div key={s.id} className="result-card result-card-link store-result" onClick={() => navigate(`/stores/${s.id}`)}>
                <div className="store-result-icon"><Store size={18} /></div>
                <div className="store-result-info">
                  <span className="result-name">{s.name}</span>
                  {s.address && <span className="result-meta-item"><MapPin size={13} /> {s.address}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hasProducts && (
        <>
          {hasStores && <h3 className="results-section-title">Products</h3>}
          <div className="results-list">
            {results.map((r, i) => (
              <div key={i} className="result-card result-card-link" onClick={() => handleProductClick(r)}>
                <div className="result-header">
                  <div>
                    <span className="result-name">{r.product_name}</span>
                    {r.brand && <span className="result-brand">{r.brand}</span>}
                    {r.unit_type !== 'piece' && (
                      <span className="result-unit">per {r.unit_abbreviation}</span>
                    )}
                  </div>
                  {r.price != null && (
                    <div className="result-price-container">
                      {r.unit_type !== 'piece' ? (
                        <>
                          <span className="result-price-per-unit">₱{Number(r.price_per_unit).toFixed(2)}/{r.unit_abbreviation}</span>
                          {r.unit_quantity !== 1 && (
                            <span className="result-total-price">₱{Number(r.price).toFixed(2)} for {r.unit_quantity}{r.unit_abbreviation}</span>
                          )}
                        </>
                      ) : (
                        <span className="result-price">₱{Number(r.price).toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
                {r.store_name && (
                  <div className="result-meta">
                    <span className="result-meta-item">
                      <MapPin size={13} /> {r.store_name}
                      {r.distance_km != null && ` · ${r.distance_km} km`}
                    </span>
                  </div>
                )}
                <div className="result-footer">
                  {r.contributor_name && (
                    <span className="result-meta-item">
                      <Avatar src={r.contributor_avatar_url} size={18} />
                      {r.contributor_name}
                    </span>
                  )}
                  {r.price_updated_at && (
                    <span className="result-meta-item">
                      <Clock size={13} /> {timeAgo(r.price_updated_at)}
                    </span>
                  )}
                  {r.confirmation_count >= 0 && (
                    <span className="result-meta-item confirmed">
                      <Users size={13} /> {r.confirmation_count} confirmed
                    </span>
                  )}
                </div>
                {r.is_available === false && <span className="result-unavailable">Marked unavailable</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
