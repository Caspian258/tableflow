import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { AuthUser } from '@tableflow/shared'
import { useAdminStore } from '../store/index'
import { api } from '../lib/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAdminStore((s) => s.setAuth)

  const [form, setForm] = useState({
    restaurantName: '',
    slug: '',
    ownerName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Auto-generar slug a partir del nombre del restaurante si el usuario no lo ha editado manualmente
      if (name === 'restaurantName' && prev.slug === slugify(prev.restaurantName)) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>(
        '/auth/register',
        form,
      )
      const { user, accessToken } = res.data
      setAuth(user, accessToken)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <div className="text-5xl mb-2">📊</div>
        <h1 className="text-2xl font-bold text-white">TableFlow</h1>
        <p className="text-indigo-200 mt-1 text-sm">30 días gratis, sin tarjeta de crédito</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-800 text-center">Crear cuenta</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Field label="Nombre del restaurante">
          <input
            name="restaurantName"
            value={form.restaurantName}
            onChange={handleChange}
            className={inputClass}
            placeholder="El Piloto"
            required
            minLength={2}
          />
        </Field>

        <Field label="Slug (URL del restaurante)" hint={`tableflow.app/${form.slug || 'mi-restaurante'}`}>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            className={inputClass}
            placeholder="el-piloto"
            pattern="[a-z0-9-]+"
            title="Solo letras minúsculas, números y guiones"
            required
            minLength={2}
          />
        </Field>

        <Field label="Tu nombre">
          <input
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            className={inputClass}
            placeholder="Juan García"
            required
            minLength={2}
          />
        </Field>

        <Field label="Correo electrónico">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            placeholder="juan@mirestaurante.com"
            required
          />
        </Field>

        <Field label="Contraseña">
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-semibold rounded-xl py-3 disabled:opacity-60 hover:bg-indigo-700 transition-colors"
        >
          {loading ? 'Creando cuenta...' : 'Comenzar prueba gratis'}
        </button>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
