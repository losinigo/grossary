/**
 * ModernProductCard — Reusable modern product card with consistent styling
 * Used for search results, recently updated items, etc.
 *
 * @param {object}   data     – product data object
 * @param {function} onClick  – click handler
 * @param {number}   [index]  – for staggered animations
 * @param {object}   [avgPrices] – for price comparison (recently updated only)
 */
import { MapPin, Clock, TrendingDown, TrendingUp } from 'lucide-react'
import { timeAgo } from '../../lib/utils'

export default function ModernProductCard({ data, onClick, index, avgPrices }) {
  // Handle different data structures
  const productName = data.product_name || data.products?.name || data.name
  const brand = data.brand || data.products?.brand
  const price = Number(data.price)
  const storeName = data.store_name || data.stores?.name
  const distanceKm = data.distance_km
  const updatedAt = data.price_updated_at || data.created_at
  const productId = data.product_id || data.id

  // Price comparison logic (for recently updated items)
  let priceComparison = null
  if (avgPrices && productId) {
    const avgData = avgPrices.find(avg => avg.product_id === productId)
    const avgPrice = avgData ? Number(avgData.avg_price) : 0
    const hasComparison = avgPrice && avgPrice > 0
    
    if (hasComparison) {
      const priceDiff = ((price - avgPrice) / avgPrice) * 100
      const isLower = priceDiff < 0
      const isHigher = priceDiff > 0
      
      priceComparison = {
        avgPrice,
        priceDiff,
        isLower,
        isHigher,
        hasComparison
      }
    }
  }

  return (
    <div 
      className="bg-white border border-gray-200 rounded-md px-4 py-3.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-all duration-700 ease-out hover:scale-[1.02] hover:shadow-md" 
      style={index !== undefined ? { 
        animationDelay: `${index * 150}ms`,
        animation: 'fadeInUp 0.8s ease-out forwards'
      } : {}}
      onClick={onClick}
    >
      <div className="flex gap-3 items-center">
        {/* Image Placeholder */}
        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500 shrink-0">
          IMG
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          {/* Product Name */}
          <div className="flex items-center gap-1 min-w-0">
            {/* Product Name (truncates) */}
            <div className="truncate min-w-0">
              <span className="text-sm text-black font-semibold">
                {productName}
              </span>
            </div>

            {/* Brand (always visible) */}
            {brand && (
              <span className="text-sm text-gray-500 shrink-0 ml-1">
                ({brand})
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-blue-500">
              ₱{price.toFixed(2)}
            </span>

            {/* Price comparison (for recently updated) */}
            {priceComparison?.hasComparison && (
              <>
                <span className="text-xs text-gray-400">
                  ~ ₱{priceComparison.avgPrice.toFixed(2)}
                </span>

                {(priceComparison.isLower || priceComparison.isHigher) && (
                  <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    priceComparison.isLower 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {Math.abs(priceComparison.priceDiff).toFixed(0)}%
                    {priceComparison.isLower ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Available Locations */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[0.72rem] text-gray-400 truncate min-w-0">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{storeName || 'Location info unavailable'}</span>
              {distanceKm && <span className="shrink-0"> · {distanceKm} km</span>}
            </span>
            {updatedAt && (
              <span className="inline-flex items-center gap-1 text-[0.72rem] text-gray-400 shrink-0 ml-2">
                <Clock size={11} />{timeAgo(updatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}