/**
 * ProductCard — Clickable card showing a product's name, brand, price,
 * store location, contributor info, and confirmation count.
 *
 * Supports two shapes of data:
 *   - Search results (product_name, store_name, price, contributor_*, etc.)
 *   - Store-detail items (product.name, product.brand, price, etc.)
 *
 * @param {object}   data    – product/price row
 * @param {function} onClick – navigation handler
 */
import { MapPin, Clock, Users } from 'lucide-react'
import { timeAgo } from '../../lib/utils'
import Avatar from '../Avatar'

const meta = 'inline-flex items-center gap-1 text-xs text-gray-500'

export default function ProductCard({ data: r, onClick }) {
  const name = r.product_name ?? r.product?.name ?? 'Unknown'
  const brand = r.brand ?? r.product?.brand
  const storeName = r.store_name ?? r.stores?.name
  const contributorName = r.contributor_name
  const contributorAvatar = r.contributor_avatar_url
  const updatedAt = r.price_updated_at ?? r.created_at
  const confirmations = r.confirmation_count

  return (
    <div
      className="bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      {/* Name + price */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <span className="text-[0.95rem] font-semibold block">{name}</span>
          {brand && <span className="text-xs text-gray-500">{brand}</span>}
          {r.unit_type !== 'piece' && r.unit_abbreviation && (
            <span className="text-xs text-primary font-medium ml-1.5">per {r.unit_abbreviation}</span>
          )}
        </div>
        {r.price != null && (
          <div className="flex flex-col items-end gap-0.5">
            {r.unit_type !== 'piece' && r.price_per_unit != null ? (
              <>
                <span className="text-lg font-bold text-green whitespace-nowrap">
                  ₱{Number(r.price_per_unit).toFixed(2)}/{r.unit_abbreviation}
                </span>
                {r.unit_quantity !== 1 && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    ₱{Number(r.price).toFixed(2)} for {r.unit_quantity}{r.unit_abbreviation}
                  </span>
                )}
              </>
            ) : (
              <span className="text-lg font-bold text-green whitespace-nowrap">
                ₱{Number(r.price).toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Store + distance */}
      {storeName && (
        <div className="flex flex-wrap gap-3 mt-2">
          <span className={meta}>
            <MapPin size={13} /> {storeName}
            {r.distance_km != null && ` · ${r.distance_km} km`}
          </span>
        </div>
      )}

      {/* Contributor, time, confirmations */}
      <div className="flex items-center flex-wrap gap-3 mt-2">
        {contributorName && (
          <span className={meta}><Avatar src={contributorAvatar} size={18} />{contributorName}</span>
        )}
        {updatedAt && (
          <span className={meta}><Clock size={13} /> {timeAgo(updatedAt)}</span>
        )}
        {confirmations >= 0 && (
          <span className={`${meta} ${confirmations > 0 ? '!text-green !font-medium' : ''}`}>
            <Users size={13} /> {confirmations} confirmed
          </span>
        )}
      </div>

      {/* Availability badge */}
      {r.is_available === false && (
        <span className="inline-block mt-2 text-xs font-medium text-red bg-red-light px-2 py-0.5 rounded-full">
          Marked unavailable
        </span>
      )}
    </div>
  )
}
