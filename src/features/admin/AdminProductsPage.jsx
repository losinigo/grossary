/**
 * AdminProductsPage — Admin dashboard for managing products
 * Admins can search, edit product details, upload images, and delete products.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Edit2, Trash2, ImageIcon, ChevronLeft, X, ImagePlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth, useUserRole, useProducts, useUpdateProduct, useDeleteProduct } from '../../lib/hooks'
import { EmptyState } from '../../components'

export default function AdminProductsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin, isLoading: roleLoading } = useUserRole()
  const updateProductMutation = useUpdateProduct()
  const deleteProductMutation = useDeleteProduct()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => () => {
    if (imagePreview && !editForm.image_url?.includes(imagePreview)) URL.revokeObjectURL(imagePreview)
  }, [imagePreview, editForm.image_url])

  /* ── Queries ──────────────────────────────────────────── */

  const { data: products = [], isLoading } = useProducts({
    search: searchQuery,
    limit: 50,
    orderBy: 'created_at',
    ascending: false
  })

  /* ── Handlers ──────────────────────────────────────────── */

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be 5MB or smaller.')
      return
    }
    setUploadError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleImageDelete = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
    setEditForm({ ...editForm, image_url: null })
  }

  const handleEditStart = (product) => {
    setEditingId(product.id)
    setEditForm(product)
    setImageFile(null)
    setImagePreview(product.image_url || '')
    setErrorMsg('')
    setSuccessMsg('')
    setUploadError('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleEditSave = async () => {
    try {
      setErrorMsg('')
      setIsUploading(true)
      
      let imageUrl = editForm.image_url
      let imagePath = null
      
      // Upload new image if selected
      if (imageFile) {
        const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        imagePath = path
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, { upsert: false })
          
        if (uploadError) {
          setUploadError(uploadError.message)
          setIsUploading(false)
          return
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path)
        imageUrl = publicUrlData.publicUrl
      }
      
      await updateProductMutation.mutateAsync({
        id: editForm.id,
        name: editForm.name,
        brand: editForm.brand || null,
        barcode: editForm.barcode || null,
        category: editForm.category || null,
        image_url: imageUrl
      })
      
      setSuccessMsg('Product updated successfully!')
      setEditingId(null)
      setIsUploading(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update product')
      setIsUploading(false)
      
      // Clean up uploaded image if database update failed
      if (imagePath) {
        await supabase.storage.from('product-images').remove([imagePath])
      }
    }
  }

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This cannot be undone.')) {
      return
    }

    try {
      setErrorMsg('')
      await deleteProductMutation.mutateAsync(productId)
      setSuccessMsg('Product deleted successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete product')
    }
  }

  /* ── Render ──────────────────────────────────────────── */

  if (roleLoading) return <div className="page"><p>Loading...</p></div>

  if (!isAdmin) {
    return (
      <div className="page">
        <EmptyState
          icon={<ChevronLeft size={48} color="var(--color-gray-300)" strokeWidth={1.2} />}
          title="Admin access required"
          message="Only admins can manage products."
          action={
            <button
              className="inline-flex items-center gap-1.5 mt-3 px-7 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:opacity-88 transition-opacity"
              onClick={() => navigate('/')}
            >
              Go Home
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-light text-[#1a7d36] px-4 py-3 rounded-md text-sm font-medium mb-4">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-md text-sm font-medium mb-4">
          {errorMsg}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-2.5 mb-6">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, barcode, or brand..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 outline-none text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Products List */}
      {isLoading ? (
        <p className="text-center py-8 text-gray-500">Loading products...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No products found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-md p-4 shadow-sm"
            >
              {editingId === product.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Product name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={editForm.brand || ''}
                        onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Barcode
                      </label>
                      <input
                        type="text"
                        value={editForm.barcode || ''}
                        onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Barcode"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Product Photo
                    </label>
                    <div className="flex flex-col gap-3">
                      {imagePreview ? (
                        <div className="relative overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                          <img src={imagePreview} alt={editForm.name} className="h-48 w-full object-contain" />
                          <label className="absolute left-2 top-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 text-blue-600 text-xs font-medium rounded-full shadow-sm cursor-pointer hover:bg-blue-100 transition-colors">
                            <ImagePlus size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                          </label>
                          <button
                            type="button"
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm hover:bg-white"
                            onClick={handleImageDelete}
                            aria-label="Remove image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100 transition-colors">
                          <ImagePlus size={20} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Upload product photo</span>
                          <span className="text-xs text-gray-500">JPG, PNG, or WebP up to 5MB</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                      )}
                      {uploadError && (
                        <p className="text-sm text-red-600 font-medium">{uploadError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleEditSave}
                      disabled={updateProductMutation.isPending || isUploading}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {updateProductMutation.isPending || isUploading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleEditCancel}
                      disabled={updateProductMutation.isPending || isUploading}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-20 w-20 object-cover rounded bg-gray-100"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-20 w-20 bg-gray-100 rounded">
                        <ImageIcon size={32} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                    {product.brand && (
                      <p className="text-xs text-gray-500">Brand: {product.brand}</p>
                    )}
                    {product.barcode && (
                      <p className="text-xs text-gray-500 font-mono">
                        Barcode: {product.barcode}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditStart(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit product"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deleteProductMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Delete product"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
