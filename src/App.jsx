import { HashRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/hooks/useAuth'
import Layout from './components/Layout'
import SearchPage from './features/search/SearchPage'
import ProductDetail from './features/search/ProductDetail'
import ProductDetailNew from './features/search/ProductDetail NEW'
import ContributePage from './features/contribute/ContributePage'
import AddStore from './features/contribute/AddStore'
import AddItem from './features/contribute/AddItem'
import AddPrice from './features/contribute/AddPrice'
import ConfirmPrice from './features/contribute/ConfirmPrice'
import StoresPage from './features/stores/StoresPage'
import StoreDetail from './features/stores/StoreDetail'
import CommunityPage from './features/community/CommunityPage'
import MemberProfile from './features/community/MemberProfile'
import ShoppingListsPage from './features/lists/ShoppingListsPage'
import ShoppingListDetail from './features/lists/ShoppingListDetail'
import ProfilePage from './features/profile/ProfilePage'
import ContributionsPage from './features/profile/ContributionsPage'
import AdminProductsPage from './features/admin/AdminProductsPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<SearchPage />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="product/v2/:id" element={<ProductDetailNew />} />
              <Route path="contribute" element={<ContributePage />} />
              <Route path="contribute/store" element={<AddStore />} />
              <Route path="contribute/item" element={<AddItem />} />
              <Route path="contribute/price" element={<AddPrice />} />
              <Route path="contribute/confirm" element={<ConfirmPrice />} />
              <Route path="stores" element={<StoresPage />} />
              <Route path="stores/:id" element={<StoreDetail />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="users/:id" element={<MemberProfile />} />
              <Route path="lists" element={<ShoppingListsPage />} />
              <Route path="lists/:id" element={<ShoppingListDetail />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/contributions" element={<ContributionsPage />} />
              <Route path="admin/products" element={<AdminProductsPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
