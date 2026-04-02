import { useState } from 'react'
import type { AuthUser } from '@tableflow/shared'
import { useKitchenStore } from '../store/index'
import { api } from '../lib/api'
import { connectSocket } from '../lib/socket'
import PinPad from '../components/PinPad'

interface Props {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: Props) {
  const restaurantSlug = useKitchenStore((s) => s.restaurantSlug)
  const setRestaurantSlug = useKitchenStore((s) => s.setRestaurantSlug)
  const setAuth = useKitchenStore((s) => s.setAuth)

  const [slugInput, setSlugInput] = useState(restaurantSlug ?? '')
  const [slugConfirmed, setSlugConfirmed] = useState(!!restaurantSlug)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePinSubmit() {
    if (pin.length !== 4 || !slugConfirmed) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post<{
        data: {
          accessToken: string
          kitchenAlertSeconds: number
          user: AuthUser
        }
      }>('/auth/login/pin', { pin, restaurantSlug: restaurantSlug ?? slugInput })

      setAuth(res.data.user, res.data.accessToken, res.data.kitchenAlertSeconds)
      connectSocket(res.data.accessToken)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN incorrecto')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de configuración del restaurante (solo la primera vez)
  if (!slugConfirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <div className="text-6xl mb-3">👨‍🍳</div>
          <h1 className="text-3xl font-bold">TableFlow KDS</h1>
          <p className="text-slate-400 mt-1">Configuración inicial</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Slug del restaurante</label>
            <input
              type="text"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value.toLowerCase().trim())}
              placeholder="el-piloto"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-lg text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <button
            onClick={() => {
              if (!slugInput) return
              setRestaurantSlug(slugInput)
              setSlugConfirmed(true)
            }}
            disabled={!slugInput}
            className="w-full bg-green-500 text-slate-900 font-bold rounded-xl py-4 text-lg disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <div className="text-5xl mb-2">👨‍🍳</div>
        <h1 className="text-2xl font-bold">Cocina</h1>
        <p className="text-slate-400 text-sm mt-1">
          {restaurantSlug ?? slugInput}
          <button
            onClick={() => setSlugConfirmed(false)}
            className="text-slate-500 underline ml-2 text-xs"
          >
            cambiar
          </button>
        </p>
      </div>

      <div className="text-center mb-2">
        <p className="text-slate-300 text-lg">Ingresa tu PIN</p>
      </div>

      <PinPad
        value={pin}
        onChange={setPin}
        onSubmit={handlePinSubmit}
        loading={loading}
        error={error}
      />
    </div>
  )
}
