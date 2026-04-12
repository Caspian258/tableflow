import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '@tableflow/shared'
import { useAppStore } from '../store/index'
import { api } from '../lib/api'
import { connectSocket } from '../lib/socket'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAppStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>(
        '/auth/login',
        { email, password },
      )
      setAuth(res.data.user, res.data.accessToken)
      connectSocket()
      navigate('/tables')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">🍽</div>
        <h1 className="text-3xl font-bold text-white">TableFlow</h1>
        <p className="text-green-100 mt-1">Sistema de órdenes</p>
      </div>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-800 text-center">Iniciar sesión</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="correo@restaurante.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white font-semibold rounded-xl py-4 text-lg active:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
