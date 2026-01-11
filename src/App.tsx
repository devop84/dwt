import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { ClientsList } from './pages/ClientsList'
import { ClientDetails } from './pages/ClientDetails'
import { DestinationsList } from './pages/DestinationsList'
import { DestinationDetails } from './pages/DestinationDetails'
import { HotelsList } from './pages/HotelsList'
import { HotelDetails } from './pages/HotelDetails'
import { GuidesList } from './pages/GuidesList'
import { GuideDetails } from './pages/GuideDetails'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
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
              path="/clients"
              element={
                <Layout>
                  <ClientsList />
                </Layout>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <Layout>
                  <ClientDetails />
                </Layout>
              }
            />
            <Route
              path="/destinations"
              element={
                <Layout>
                  <DestinationsList />
                </Layout>
              }
            />
            <Route
              path="/destinations/:id"
              element={
                <Layout>
                  <DestinationDetails />
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
              path="/hotels/:id"
              element={
                <Layout>
                  <HotelDetails />
                </Layout>
              }
            />
            <Route
              path="/guides"
              element={
                <Layout>
                  <GuidesList />
                </Layout>
              }
            />
            <Route
              path="/guides/:id"
              element={
                <Layout>
                  <GuideDetails />
                </Layout>
              }
            />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
