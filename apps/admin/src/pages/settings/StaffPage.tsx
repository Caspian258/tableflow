import { useEffect, useState } from 'react'
import SettingsLayout from '../../components/SettingsLayout'
import { api } from '../../lib/api'

interface StaffRow {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'waiter' | 'kitchen'
  pin: string | null
  isActive: boolean
  createdAt: string
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dueño',
  manager: 'Gerente',
  waiter: 'Mesero',
  kitchen: 'Cocina',
}

const ROLE_COLOR: Record<string, string> = {
  owner: 'bg-indigo-100 text-indigo-700',
  manager: 'bg-violet-100 text-violet-700',
  waiter: 'bg-emerald-100 text-emerald-700',
  kitchen: 'bg-orange-100 text-orange-700',
}

interface StaffForm {
  name: string
  email: string
  password: string
  role: 'manager' | 'waiter' | 'kitchen'
  pin: string
}

const EMPTY_FORM: StaffForm = { name: '', email: '', password: '', role: 'waiter', pin: '' }

function CreateStaffModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (user: StaffRow) => void
}) {
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!form.name.trim()) return setErr('El nombre es requerido')
    if (!form.email.trim()) return setErr('El email es requerido')
    if (form.password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres')
    if (form.role === 'kitchen' && form.pin && !/^\d{4}$/.test(form.pin)) {
      return setErr('El PIN debe ser de 4 dígitos')
    }

    setSaving(true)
    setErr('')
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        pin: form.pin.trim() || undefined,
      }
      const res = await api.post<{ data: StaffRow }>('/staff', body)
      onSave(res.data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Agregar personal</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Contraseña *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Rol *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffForm['role'] }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="waiter">Mesero</option>
              <option value="kitchen">Cocina</option>
              <option value="manager">Gerente</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              PIN de 4 dígitos{' '}
              <span className="text-gray-400">(para login rápido en tablet)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={form.pin}
              onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 tracking-widest"
              placeholder="1234"
            />
          </div>
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPinModal({
  user,
  onClose,
  onSave,
}: {
  user: StaffRow
  onClose: () => void
  onSave: (updated: StaffRow) => void
}) {
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!/^\d{4}$/.test(pin)) return setErr('El PIN debe ser exactamente 4 dígitos')
    setSaving(true)
    setErr('')
    try {
      const res = await api.patch<{ data: StaffRow }>(`/staff/${user.id}/reset-pin`, { pin })
      onSave(res.data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al resetear PIN')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Resetear PIN</h3>
        <p className="text-sm text-gray-500">
          Nuevo PIN para <strong>{user.name}</strong>
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-center text-2xl tracking-widest outline-none focus:border-indigo-400"
          placeholder="••••"
        />
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar PIN'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [resetPinUser, setResetPinUser] = useState<StaffRow | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ data: StaffRow[] }>('/staff')
      setStaff(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar personal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function toggleActive(user: StaffRow) {
    try {
      const res = await api.patch<{ data: StaffRow }>(`/staff/${user.id}/toggle-active`, {})
      setStaff((prev) => prev.map((u) => (u.id === user.id ? res.data : u)))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <SettingsLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Personal</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {staff.length} usuario{staff.length !== 1 ? 's' : ''} del restaurante
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            + Agregar
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Rol</th>
                  <th className="text-center px-4 py-3 font-medium">PIN</th>
                  <th className="text-center px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {u.pin ? (
                        <span className="font-mono tracking-widest">{u.pin}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        {u.role !== 'owner' && (
                          <>
                            <button
                              onClick={() => void toggleActive(u)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              {u.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => setResetPinUser(u)}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Reset PIN
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {staff.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-8 text-center">
                No hay usuarios en el restaurante.
              </p>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onSave={(user) => {
            setStaff((prev) => [...prev, user])
            setShowCreate(false)
          }}
        />
      )}

      {resetPinUser && (
        <ResetPinModal
          user={resetPinUser}
          onClose={() => setResetPinUser(null)}
          onSave={(updated) => {
            setStaff((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
            setResetPinUser(null)
          }}
        />
      )}
    </SettingsLayout>
  )
}
