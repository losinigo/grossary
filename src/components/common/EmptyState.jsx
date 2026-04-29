/**
 * EmptyState — Centered placeholder shown when a list is empty or a search has no results.
 *
 * @param {ReactNode} icon     – Lucide icon element displayed above the title
 * @param {string}    title    – bold heading
 * @param {string}    [message] – optional description below the title
 * @param {ReactNode} [action] – optional CTA button / element
 */
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center text-center py-15 px-5 gap-2">
      {icon}
      <p className="text-base font-semibold text-gray-900 mt-2">{title}</p>
      {message && (
        <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">{message}</p>
      )}
      {action}
    </div>
  )
}
