/**
 * StoreCard — Clickable card displaying a store's name, address, and optional distance.
 *
 * @param {object}   store       – { id, name, address, distance_km? }
 * @param {function} onClick     – navigation handler
 */
import { Store, MapPin } from 'lucide-react'

export default function StoreCard({ store, onClick }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3"
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-gray-100 text-gray-500 shrink-0">
        <Store size={18} />
      </div>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-[0.95rem] font-semibold">{store.name}</span>
        {store.address && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 truncate">
            <MapPin size={13} /> {store.address}
          </span>
        )}
      </div>
      {store.distance_km != null && (
        <span className="text-sm font-semibold text-primary whitespace-nowrap">
          {store.distance_km} km
        </span>
      )}
    </div>
  )
}
