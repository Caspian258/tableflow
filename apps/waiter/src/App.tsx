import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/index'
import { connectSocket } from './lib/socket'
import LoginPage from './pages/LoginPage'
import TablesPage from './pages/TablesPage'
import NewOrderPage from './pages/NewOrderPage'
import OrderDetailPage from './pages/OrderDetailPage'
import AddItemsPage from './pages/AddItemsPage'
import CheckoutPage from './pages/CheckoutPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const user = useAppStore((s) => s.user)
  const accessToken = useAppStore((s) => s.accessToken)

  // Si hay sesión restaurada desde localStorage al arrancar, conectar el socket
  useEffect(() => {
    if (user && accessToken) {
      connectSocket()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/tables"
          element={
            <RequireAuth>
              <TablesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/new/:tableId"
          element={
            <RequireAuth>
              <NewOrderPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:orderId/add"
          element={
            <RequireAuth>
              <AddItemsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:orderId/checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/tables" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
