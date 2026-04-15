import { User } from 'lucide-react'
import './Avatar.css'

export default function Avatar({ src, size = 18 }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="avatar-sm"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <div className="avatar-sm avatar-sm-fallback" style={{ width: size, height: size }}>
      <User size={Math.floor(size * 0.6)} />
    </div>
  )
}
