import { useEffect } from 'react'
import { useKitchenStore } from './store/index'
import LoginPage from './pages/LoginPage'
import KDSPage from './pages/KDSPage'
import { connectSocket } from './lib/socket'

export default function App() {
  const user = useKitchenStore((s) => s.user)
  const accessToken = useKitchenStore((s) => s.accessToken)

  // Si hay sesión restaurada desde localStorage al arrancar, conectar el socket
  useEffect(() => {
    if (user && accessToken) {
      connectSocket()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El estado del usuario en el store es reactivo: al hacer login/logout re-renderiza
  if (user) {
    return <KDSPage onLogout={() => {}} />
  }
  return <LoginPage onLogin={() => {}} />
}
