/** Formats a date as a human-readable relative time string (e.g. "2d ago", "1w ago"). */
export function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

/** Formats a numeric value to two decimal places. */
export function formatPrice(value) {
  return Number(value).toFixed(2)
}
