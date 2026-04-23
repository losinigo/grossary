/**
 * ProductSearchInput — Autocomplete input that searches products by name/brand/barcode
 * and shows a dropdown of matches.
 *
 * @param {string}   value          – controlled input value
 * @param {function} onChange       – called with the raw input string
 * @param {function} onSelect      – called with the selected product object
 * @param {array}    results       – product search results to display
 * @param {boolean}  showDropdown  – whether to show the dropdown (false when a product is selected)
 * @param {string}   [placeholder] – input placeholder text
 * @param {string}   [label]       – label text above the input
 */
const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-sm text-[0.95rem] text-gray-900 outline-none focus:border-primary font-[inherit] placeholder:text-gray-400'
const labelCls = 'flex flex-col gap-1.5 text-xs font-semibold text-gray-500'
const dropdownItem = 'block w-full px-3.5 py-2.5 text-left text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors'

export default function ProductSearchInput({
  value,
  onChange,
  onSelect,
  results = [],
  showDropdown,
  placeholder = 'Search by name, brand, or barcode',
  label = 'Search Product *',
}) {
  return (
    <div className="relative">
      <label className={labelCls}>
        {label}
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-sm shadow-md overflow-hidden z-100">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className={dropdownItem}
              onClick={() => onSelect(p)}
            >
              {p.name} {p.brand && <span className="text-gray-500">— {p.brand}</span>}
              {p.unit_type !== 'piece' && p.unit_abbreviation && (
                <span className="text-gray-500"> • per {p.unit_abbreviation}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
