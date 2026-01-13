import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { ClientsList } from './pages/ClientsList'
import { ClientDetails } from './pages/ClientDetails'
import { LocationsList } from './pages/LocationsList'
import { LocationDetails } from './pages/LocationDetails'
import { HotelsList } from './pages/HotelsList'
import { HotelDetails } from './pages/HotelDetails'
import { GuidesList } from './pages/GuidesList'
import { GuideDetails } from './pages/GuideDetails'
import { VehiclesList } from './pages/VehiclesList'
import { VehicleDetails } from './pages/VehicleDetails'
import { CaterersList } from './pages/CaterersList'
import { CatererDetails } from './pages/CatererDetails'
import { AccountsList } from './pages/AccountsList'
import { AccountDetails } from './pages/AccountDetails'
import { CompanyAccountsList } from './pages/CompanyAccountsList'
import { CompanyAccountDetails } from './pages/CompanyAccountDetails'
import { ThirdPartiesList } from './pages/ThirdPartiesList'
import { ThirdPartyDetails } from './pages/ThirdPartyDetails'

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
              path="/locations"
              element={
                <Layout>
                  <LocationsList />
                </Layout>
              }
            />
            <Route
              path="/locations/:id"
              element={
                <Layout>
                  <LocationDetails />
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
            <Route
              path="/vehicles"
              element={
                <Layout>
                  <VehiclesList />
                </Layout>
              }
            />
            <Route
              path="/vehicles/:id"
              element={
                <Layout>
                  <VehicleDetails />
                </Layout>
              }
            />
            <Route
              path="/caterers"
              element={
                <Layout>
                  <CaterersList />
                </Layout>
              }
            />
            <Route
              path="/caterers/:id"
              element={
                <Layout>
                  <CatererDetails />
                </Layout>
              }
            />
            <Route
              path="/accounts"
              element={
                <Layout>
                  <AccountsList />
                </Layout>
              }
            />
            <Route
              path="/accounts/:id"
              element={
                <Layout>
                  <AccountDetails />
                </Layout>
              }
            />
            <Route
              path="/company-accounts"
              element={
                <Layout>
                  <CompanyAccountsList />
                </Layout>
              }
            />
            <Route
              path="/company-accounts/:id"
              element={
                <Layout>
                  <CompanyAccountDetails />
                </Layout>
              }
            />
            <Route
              path="/third-parties"
              element={
                <Layout>
                  <ThirdPartiesList />
                </Layout>
              }
            />
            <Route
              path="/third-parties/:id"
              element={
                <Layout>
                  <ThirdPartyDetails />
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
