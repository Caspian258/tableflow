import { useEffect, useState } from 'react'
import SettingsLayout from '../../components/SettingsLayout'
import { api } from '../../lib/api'

interface RestaurantData {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  timezone: string
  currency: string
  kitchenAlertSeconds: number
}

interface Form {
  name: string
  slug: string
  phone: string
  address: string
  kitchenAlertSeconds: string
}

export default function RestaurantPage() {
  const [data, setData] = useState<RestaurantData | null>(null)
  const [form, setForm] = useState<Form>({
    name: '',
    slug: '',
    phone: '',
    address: '',
    kitchenAlertSeconds: '600',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ data: RestaurantData }>('/restaurant')
        setData(res.data)
        setForm({
          name: res.data.name,
          slug: res.data.slug,
          phone: res.data.phone ?? '',
          address: res.data.address ?? '',
          kitchenAlertSeconds: String(res.data.kitchenAlertSeconds),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!form.name.trim()) return setError('El nombre es requerido')
    if (!form.slug.trim()) return setError('El slug es requerido')
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      return setError('El slug solo puede tener letras minúsculas, números y guiones')
    }

    const alertSecs = parseInt(form.kitchenAlertSeconds, 10)
    if (!alertSecs || alertSecs < 30 || alertSecs > 3600) {
      return setError('El tiempo de alerta debe estar entre 30 y 3600 segundos')
    }

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        kitchenAlertSeconds: alertSecs,
      }
      const res = await api.patch<{ data: RestaurantData }>('/restaurant', body)
      setData((prev) => (prev ? { ...prev, ...res.data } : res.data))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  return (
    <SettingsLayout>
      <div className="max-w-xl space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Restaurante</h2>
          <p className="text-sm text-gray-500 mt-0.5">Datos generales y configuración</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Información general</h3>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Nombre del restaurante *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => ({
                      ...f,
                      name,
                      // Auto-generar slug solo si no ha sido editado manualmente
                      slug: data && f.slug === data.slug ? slugify(name) : f.slug,
                    }))
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="Mi Restaurante"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Slug (URL amigable) *
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-indigo-400">
                  <span className="bg-gray-50 px-3 py-2 text-xs text-gray-400 border-r border-gray-200">
                    tableflow.app/
                  </span>
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                    }
                    className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                    placeholder="mi-restaurante"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="+52 55 1234 5678"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Dirección</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
                  placeholder="Calle, colonia, ciudad"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Configuración de cocina</h3>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Tiempo de alerta en cocina (segundos)
                </label>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={form.kitchenAlertSeconds}
                  onChange={(e) => setForm((f) => ({ ...f, kitchenAlertSeconds: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  La pantalla de cocina marcará la orden en rojo cuando supere este tiempo.{' '}
                  <strong>{Math.round(parseInt(form.kitchenAlertSeconds, 10) / 60)} min</strong>
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                Cambios guardados correctamente.
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white font-medium rounded-xl py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </div>
    </SettingsLayout>
  )
}
