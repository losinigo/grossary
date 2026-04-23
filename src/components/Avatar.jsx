/**
 * Avatar — Displays a user's profile image or a generic placeholder icon.
 *
 * @param {string} [src]  – image URL (falls back to a gray User icon)
 * @param {number} [size] – pixel dimensions (default 18)
 */
import { User } from 'lucide-react'

export default function Avatar({ src, size = 18 }) {
  const style = { width: size, height: size }

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={style}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <div className="rounded-full bg-gray-200 text-gray-400 flex items-center justify-center shrink-0" style={style}>
      <User size={Math.floor(size * 0.6)} />
    </div>
  )
}
