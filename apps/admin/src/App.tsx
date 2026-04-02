import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAdminStore } from './store/index'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

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
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
