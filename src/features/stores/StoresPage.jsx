import { MapPin } from 'lucide-react'
import './StoresPage.css'

export default function StoresPage() {
  return (
    <div className="page">
      <h2 className="page-title">Nearby Stores</h2>
      <p className="page-subtitle">Grocery stores in your area.</p>
      <div className="empty-state">
        <div className="empty-icon-ring">
          <MapPin size={32} color="var(--color-primary)" />
        </div>
        <p className="empty-title">Enable location access</p>
        <p className="empty-subtitle">Allow location access to find grocery stores near you.</p>
        <button className="btn-primary">Allow Location</button>
      </div>
    </div>
  )
}
