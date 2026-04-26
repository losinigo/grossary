/**
 * Examples of how to use useUserRole() in your components
 * 
 * File: src/lib/hooks/useUserRole-EXAMPLES.js
 * Delete this file once you've implemented the examples
 */

// ============================================================
// Example 1: Show/hide UI based on role
// ============================================================

import { useUserRole } from './useUserRole'

function AddItemButton() {
  const { canAddItems, isPremium } = useUserRole()

  if (!canAddItems) {
    return <p>Only logged-in users can add items</p>
  }

  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded">
      Add Item
      {isPremium && <span className="ml-2 text-xs">✨ Premium</span>}
    </button>
  )
}

// ============================================================
// Example 2: Conditionally show premium features
// ============================================================

function ProductCard({ product }) {
  const { canUploadPhotos } = useUserRole()

  return (
    <div className="card">
      <img src={product.image_url} alt={product.name} />
      <h3>{product.name}</h3>
      
      {canUploadPhotos && (
        <button className="text-sm text-blue-500">
          Update Photo
        </button>
      )}
    </div>
  )
}

// ============================================================
// Example 3: Disable actions for non-premium users
// ============================================================

function ConfirmPriceButton({ priceId }) {
  const { role, canConfirmPrices } = useUserRole()

  if (role === 'free') {
    return (
      <button 
        disabled 
        title="Premium members can confirm prices"
        className="opacity-50 cursor-not-allowed"
      >
        Confirm
      </button>
    )
  }

  return (
    <button onClick={() => confirmPrice(priceId)}>
      Confirm Price
    </button>
  )
}

// ============================================================
// Example 4: Show admin tools
// ============================================================

function AdminPanel() {
  const { isAdmin } = useUserRole()

  if (!isAdmin) {
    return <div>Access denied</div>
  }

  return (
    <div className="admin-panel">
      <h2>Admin Dashboard</h2>
      {/* Admin features here */}
    </div>
  )
}
