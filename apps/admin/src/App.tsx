import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAdminStore } from './store/index'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import BillingPage from './pages/BillingPage'
import TablesPage from './pages/settings/TablesPage'
import MenuPage from './pages/settings/MenuPage'
import StaffPage from './pages/settings/StaffPage'
import RestaurantPage from './pages/settings/RestaurantPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAdminStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/billing"
          element={
            <RequireAuth>
              <BillingPage />
            </RequireAuth>
          }
        />
        {/* Settings */}
        <Route
          path="/settings/restaurant"
          element={
            <RequireAuth>
              <RestaurantPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/tables"
          element={
            <RequireAuth>
              <TablesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/menu"
          element={
            <RequireAuth>
              <MenuPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/staff"
          element={
            <RequireAuth>
              <StaffPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
