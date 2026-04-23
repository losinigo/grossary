/**
 * SectionTitle — Small uppercase section heading used to label groups of content.
 *
 * @param {string} children  – heading text
 * @param {string} [className] – extra Tailwind classes to merge
 */
export default function SectionTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-black tracking-wide mb-2.5 ${className}`}>
      {children}
    </h3>
  )
}
