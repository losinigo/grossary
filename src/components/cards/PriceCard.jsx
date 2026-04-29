/**
 * PriceCard — Displays a single price entry with store info, contributor,
 * confirmation count, and optional confirm/deny action buttons.
 *
 * @param {object}   price            – price row (from current_prices + joined store)
 * @param {object}   [myConfirmations] – { [priceId]: boolean } map of user's votes
 * @param {string}   [currentUserId]  – hide buttons for the user's own prices
 * @param {function} [onConfirm]      – called with { priceId, confirmed: true }
 * @param {function} [onDeny]         – called with { priceId, confirmed: false }
 * @param {boolean}  [isPending]      – disables buttons while mutation is in flight
 */
import { MapPin, Users, CheckCircle, XCircle } from 'lucide-react'
import { timeAgo } from '../../lib/utils'
import { Avatar } from '../index'

const meta = 'inline-flex items-center gap-1 text-xs text-gray-500'
const confirmBase = 'inline-flex items-center gap-1.5 flex-1 justify-center py-2 px-3 text-[0.82rem] font-semibold rounded-sm transition-opacity disabled:opacity-50'

export default function PriceCard({
  price: p,
  myConfirmations,
  currentUserId,
  onConfirm,
  onDeny,
  isPending,
}) {
  const status = myConfirmations?.[p.id]
  const showActions = currentUserId && currentUserId !== p.user_id && onConfirm

  return (
    <div className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm">
      {/* Price + timestamp */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold text-green">₱{Number(p.price).toFixed(2)}</span>
        <span className="text-xs text-gray-500">{timeAgo(p.created_at)}</span>
      </div>

      {/* Store */}
      {p.store && (
        <span className={meta}>
          <MapPin size={13} /> {p.store.name}{p.store.address ? ` — ${p.store.address}` : ''}
        </span>
      )}

      {/* Contributor + confirmations */}
      <div className="flex items-center gap-3">
        {p.contributor_name && (
          <span className={meta}><Avatar src={p.contributor_avatar_url} size={18} />{p.contributor_name}</span>
        )}
        <span className={`${meta} ${p.confirmation_count > 0 ? '!text-green !font-medium' : ''}`}>
          <Users size={13} /> {p.confirmation_count} confirmed
        </span>
      </div>

      {/* Availability */}
      {p.is_available === false && (
        <span className="inline-block text-xs font-medium text-red bg-red-light px-2 py-0.5 rounded-full self-start">
          Marked unavailable
        </span>
      )}

      {/* Confirm / Deny buttons */}
      {showActions && (
        <div className="flex gap-2 mt-1">
          <button
            className={`${confirmBase} ${status === true ? 'bg-green-light text-green font-bold shadow-[inset_0_0_0_2px_currentColor]' : status === false ? 'opacity-35 bg-gray-100 text-gray-400' : 'bg-green-light text-green'}`}
            onClick={() => onConfirm({ priceId: p.id, confirmed: true })}
            disabled={isPending}
          >
            <CheckCircle size={16} /> {status === true ? 'Confirmed' : 'Confirm'}
          </button>
          <button
            className={`${confirmBase} ${status === false ? 'bg-red-light text-red font-bold shadow-[inset_0_0_0_2px_currentColor]' : status === true ? 'opacity-35 bg-gray-100 text-gray-400' : 'bg-red-light text-red'}`}
            onClick={() => onDeny({ priceId: p.id, confirmed: false })}
            disabled={isPending}
          >
            <XCircle size={16} /> {status === false ? 'Denied' : 'Deny'}
          </button>
        </div>
      )}

      {/* Own-price indicator */}
      {currentUserId && currentUserId === p.user_id && (
        <p className="text-xs text-gray-400 italic mt-1">You reported this price</p>
      )}
    </div>
  )
}
