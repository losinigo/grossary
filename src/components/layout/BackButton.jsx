/**
 * BackButton — Consistent "← Back" navigation link used at the top of detail pages.
 *
 * @param {function} onClick – navigation handler (typically () => navigate(-1) or a fixed path)
 * @param {string}   [label] – button text (defaults to "Back")
 */
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ onClick, label = 'Back' }) {
  return (
    <button
      className="inline-flex items-center gap-1 text-primary text-sm font-medium mb-3 py-1"
      onClick={onClick}
    >
      <ArrowLeft size={18} /> {label}
    </button>
  )
}
