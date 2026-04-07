import { HashRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/hooks/useAuth'
import Layout from './components/Layout'
import SearchPage from './features/search/SearchPage'
import ContributePage from './features/contribute/ContributePage'
import AddStore from './features/contribute/AddStore'
import AddItem from './features/contribute/AddItem'
import AddPrice from './features/contribute/AddPrice'
import StoresPage from './features/stores/StoresPage'
import ProfilePage from './features/profile/ProfilePage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<SearchPage />} />
              <Route path="contribute" element={<ContributePage />} />
            <Route path="contribute/store" element={<AddStore />} />
            <Route path="contribute/item" element={<AddItem />} />
            <Route path="contribute/price" element={<AddPrice />} />
              <Route path="stores" element={<StoresPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
