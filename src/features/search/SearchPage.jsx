import { Search, ScanBarcode } from 'lucide-react'
import './SearchPage.css'

export default function SearchPage() {
  return (
    <div className="page">
      <div className="search-bar">
        <Search size={18} color="var(--color-gray-400)" />
        <input type="text" placeholder="Search for groceries..." className="search-input" />
        <button className="scan-btn" aria-label="Scan barcode">
          <ScanBarcode size={20} />
        </button>
      </div>
      <div className="empty-state">
        <Search size={48} color="var(--color-gray-300)" strokeWidth={1.2} />
        <p className="empty-title">Find the best prices nearby</p>
        <p className="empty-subtitle">Search for an item or scan a barcode to see which stores carry it and at what price.</p>
      </div>
    </div>
  )
}
