import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { DownwindersList } from './pages/DownwindersList'
import { DownwinderDetail } from './pages/DownwinderDetail'
import { SpotsList } from './pages/SpotsList'
import { HotelsList } from './pages/HotelsList'
import { ClientsList } from './pages/ClientsList'
import { BookingsList } from './pages/BookingsList'
import { UserRole } from './types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<ProtectedRoute />}>
              <Route
                path="/"
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
              <Route
                path="/downwinders"
                element={
                  <Layout>
                    <DownwindersList />
                  </Layout>
                }
              />
              <Route
                path="/downwinders/:id"
                element={
                  <Layout>
                    <DownwinderDetail />
                  </Layout>
                }
              />
              <Route
                element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.GUIDE]} />}
              >
                <Route
                  path="/spots"
                  element={
                    <Layout>
                      <SpotsList />
                    </Layout>
                  }
                />
                <Route
                  path="/hotels"
                  element={
                    <Layout>
                      <HotelsList />
                    </Layout>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <Layout>
                      <ClientsList />
                    </Layout>
                  }
                />
              </Route>
              <Route
                path="/bookings"
                element={
                  <Layout>
                    <BookingsList />
                  </Layout>
                }
              />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App