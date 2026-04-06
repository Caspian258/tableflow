import { useEffect, useState } from 'react'
import SettingsLayout from '../../components/SettingsLayout'
import { api } from '../../lib/api'

interface TableRow {
  id: string
  number: number
  name: string | null
  capacity: number
  status: string
}

interface TableForm {
  number: string
  name: string
  capacity: string
}

const EMPTY_FORM: TableForm = { number: '', name: '', capacity: '4' }

export default function TablesPage() {
  const [tables, setTables] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TableForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ data: TableRow[] }>('/tables')
      setTables(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar mesas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(t: TableRow) {
    setEditingId(t.id)
    setForm({ number: String(t.number), name: t.name ?? '', capacity: String(t.capacity) })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    setFormError('')
    const num = parseInt(form.number, 10)
    const cap = parseInt(form.capacity, 10)
    if (!num || num < 1) return setFormError('El número de mesa debe ser mayor a 0')
    if (!cap || cap < 1) return setFormError('La capacidad debe ser al menos 1')

    setSaving(true)
    try {
      const body = { number: num, name: form.name.trim() || undefined, capacity: cap }
      if (editingId) {
        const res = await api.patch<{ data: TableRow }>(`/tables/${editingId}`, body)
        setTables((prev) => prev.map((t) => (t.id === editingId ? res.data : t)))
      } else {
        const res = await api.post<{ data: TableRow }>('/tables', body)
        setTables((prev) => [...prev, res.data].sort((a, b) => a.number - b.number))
      }
      setShowModal(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(t: TableRow) {
    if (!confirm(`¿Eliminar Mesa ${t.number}${t.name ? ` — ${t.name}` : ''}?`)) return
    try {
      await api.delete(`/tables/${t.id}`)
      setTables((prev) => prev.filter((x) => x.id !== t.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    available: 'Disponible',
    occupied: 'Ocupada',
    reserved: 'Reservada',
    cleaning: 'Limpieza',
  }
  const STATUS_COLOR: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    occupied: 'bg-red-100 text-red-700',
    reserved: 'bg-amber-100 text-amber-700',
    cleaning: 'bg-gray-100 text-gray-600',
  }

  return (
    <SettingsLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mesas</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {tables.length} mesa{tables.length !== 1 ? 's' : ''} configurada{tables.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            + Agregar mesa
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : tables.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-12 text-center">
            <p className="text-4xl mb-3">🪑</p>
            <p className="text-gray-500 text-sm">No hay mesas configuradas aún.</p>
            <button
              onClick={openCreate}
              className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
            >
              Agregar la primera mesa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{t.number}</p>
                    {t.name && <p className="text-xs text-gray-400 mt-0.5">{t.name}</p>}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Cap. {t.capacity} personas</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => void handleDelete(t)}
                    className="flex-1 text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editingId ? 'Editar mesa' : 'Agregar mesa'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Número <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Nombre / etiqueta <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="Terraza 1, Barra 2…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Capacidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="4"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  )
}
