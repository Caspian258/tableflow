import { useState } from 'react'
import { useKitchenStore } from './store/index'
import LoginPage from './pages/LoginPage'
import KDSPage from './pages/KDSPage'

export default function App() {
  const user = useKitchenStore((s) => s.user)
  const [screen, setScreen] = useState<'login' | 'kds'>(user ? 'kds' : 'login')

  return screen === 'kds' && user ? (
    <KDSPage onLogout={() => setScreen('login')} />
  ) : (
    <LoginPage onLogin={() => setScreen('kds')} />
  )
}
