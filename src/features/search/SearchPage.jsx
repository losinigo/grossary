import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanBarcode, MapPin, Clock, Users, PlusCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import BarcodeScanner from '../../components/BarcodeScanner'
import './SearchPage.css'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [coords, setCoords] = useState(null)
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

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  return (
    <div className="page">
      <form className="search-bar" onSubmit={handleSearch}>
        <Search size={18} color="var(--color-gray-400)" />
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for groceries..."
        />
        <button type="button" className="scan-btn" onClick={() => setScanning(true)} aria-label="Scan barcode">
          <ScanBarcode size={20} />
        </button>
      </form>

      {!searchTerm && !isLoading && (
        <div className="empty-state">
          <Search size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
          <p className="empty-title">Find the best prices nearby</p>
          <p className="empty-subtitle">Search for an item or scan a barcode to see which stores carry it and at what price.</p>
        </div>
      )}

      {isLoading && <p className="search-status">Searching...</p>}

      {searchTerm && !isLoading && results?.length === 0 && (
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

      {results?.length > 0 && (
        <div className="results-list">
          {results.map((r, i) => (
            <div key={i} className="result-card">
              <div className="result-header">
                <div>
                  <span className="result-name">{r.product_name}</span>
                  {r.brand && <span className="result-brand">{r.brand}</span>}
                </div>
                {r.price != null && <span className="result-price">₱{Number(r.price).toFixed(2)}</span>}
              </div>
              {r.store_name && (
                <div className="result-meta">
                  <span className="result-meta-item">
                    <MapPin size={13} /> {r.store_name}
                    {r.distance_km != null && ` · ${r.distance_km} km`}
                  </span>
                  {r.price_updated_at && (
                    <span className="result-meta-item">
                      <Clock size={13} /> {timeAgo(r.price_updated_at)}
                    </span>
                  )}
                  {r.confirmation_count > 0 && (
                    <span className="result-meta-item confirmed">
                      <Users size={13} /> {r.confirmation_count} confirmed
                    </span>
                  )}
                </div>
              )}
              {r.is_available === false && <span className="result-unavailable">Marked unavailable</span>}
            </div>
          ))}
        </div>
      )}

      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}
