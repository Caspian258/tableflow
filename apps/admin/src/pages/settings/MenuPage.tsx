import { useEffect, useState } from 'react'
import SettingsLayout from '../../components/SettingsLayout'
import { api } from '../../lib/api'

interface MenuItemRow {
  id: string
  name: string
  description: string | null
  price: number
  preparationMinutes: number
  isActive: boolean
  isAvailable: boolean
  sortOrder: number
  categoryId: string
}

interface CategoryRow {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  items: MenuItemRow[]
}

// ─── Modal de categoría ───────────────────────────────────────────────────────

interface CatForm { name: string; description: string; sortOrder: string }
const EMPTY_CAT: CatForm = { name: '', description: '', sortOrder: '0' }

function CategoryModal({
  editing,
  onClose,
  onSave,
}: {
  editing: CategoryRow | null
  onClose: () => void
  onSave: (cat: CategoryRow) => void
}) {
  const [form, setForm] = useState<CatForm>(
    editing
      ? { name: editing.name, description: editing.description ?? '', sortOrder: String(editing.sortOrder) }
      : EMPTY_CAT
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!form.name.trim()) return setErr('El nombre es requerido')
    setSaving(true)
    setErr('')
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }
      if (editing) {
        const res = await api.patch<{ data: CategoryRow }>(`/menu/categories/${editing.id}`, body)
        onSave({ ...res.data, items: editing.items })
      } else {
        const res = await api.post<{ data: CategoryRow }>('/menu/categories', body)
        onSave({ ...res.data, items: [] })
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          {editing ? 'Editar categoría' : 'Nueva categoría'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Entradas, Bebidas…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Orden</label>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
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
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de platillo ────────────────────────────────────────────────────────

interface ItemForm {
  categoryId: string
  name: string
  description: string
  price: string
  preparationMinutes: string
  isAvailable: boolean
}

function ItemModal({
  editing,
  categories,
  defaultCategoryId,
  onClose,
  onSave,
}: {
  editing: MenuItemRow | null
  categories: CategoryRow[]
  defaultCategoryId: string
  onClose: () => void
  onSave: (item: MenuItemRow, oldCategoryId?: string) => void
}) {
  const [form, setForm] = useState<ItemForm>(
    editing
      ? {
          categoryId: editing.categoryId,
          name: editing.name,
          description: editing.description ?? '',
          price: String(editing.price),
          preparationMinutes: String(editing.preparationMinutes),
          isAvailable: editing.isAvailable,
        }
      : {
          categoryId: defaultCategoryId,
          name: '',
          description: '',
          price: '',
          preparationMinutes: '15',
          isAvailable: true,
        }
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!form.name.trim()) return setErr('El nombre es requerido')
    const price = parseFloat(form.price)
    if (!price || price <= 0) return setErr('El precio debe ser mayor a 0')
    const prepMin = parseInt(form.preparationMinutes, 10) || 15

    setSaving(true)
    setErr('')
    try {
      const body = {
        categoryId: form.categoryId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        preparationMinutes: prepMin,
        isAvailable: form.isAvailable,
      }
      if (editing) {
        const oldCat = editing.categoryId
        const res = await api.patch<{ data: MenuItemRow }>(`/menu/items/${editing.id}`, body)
        onSave(res.data, oldCat)
      } else {
        const res = await api.post<{ data: MenuItemRow }>('/menu/items', body)
        onSave(res.data)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900">
          {editing ? 'Editar platillo' : 'Nuevo platillo'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Categoría *</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Nombre del platillo"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Precio *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Prep. (min)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.preparationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, preparationMinutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Disponible</span>
          </label>
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
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type ModalState =
  | { type: 'none' }
  | { type: 'category'; editing: CategoryRow | null }
  | { type: 'item'; editing: MenuItemRow | null; defaultCategoryId: string }

export default function MenuPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ data: CategoryRow[] }>('/menu/categories')
      setCategories(res.data)
      if (res.data.length > 0 && expandedCat === null) {
        setExpandedCat(res.data[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el menú')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function deleteCategory(cat: CategoryRow) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return
    try {
      await api.delete(`/menu/categories/${cat.id}`)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  async function deleteItem(item: MenuItemRow) {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return
    try {
      await api.delete(`/menu/items/${item.id}`)
      setCategories((prev) =>
        prev.map((c) =>
          c.id === item.categoryId ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c
        )
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  async function toggleAvailability(item: MenuItemRow) {
    try {
      const res = await api.patch<{ data: MenuItemRow }>(`/menu/items/${item.id}`, {
        isAvailable: !item.isAvailable,
      })
      setCategories((prev) =>
        prev.map((c) =>
          c.id === item.categoryId
            ? { ...c, items: c.items.map((i) => (i.id === item.id ? res.data : i)) }
            : c
        )
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  function onCategorySaved(cat: CategoryRow) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = cat
        return next
      }
      return [...prev, cat]
    })
    setModal({ type: 'none' })
    setExpandedCat(cat.id)
  }

  function onItemSaved(item: MenuItemRow, oldCategoryId?: string) {
    setCategories((prev) =>
      prev.map((c) => {
        // Si la categoría cambió, quitar del antiguo
        if (oldCategoryId && c.id === oldCategoryId && c.id !== item.categoryId) {
          return { ...c, items: c.items.filter((i) => i.id !== item.id) }
        }
        if (c.id === item.categoryId) {
          const idx = c.items.findIndex((i) => i.id === item.id)
          if (idx >= 0) {
            const items = [...c.items]
            items[idx] = item
            return { ...c, items }
          }
          return { ...c, items: [...c.items, item] }
        }
        return c
      })
    )
    setModal({ type: 'none' })
  }

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0)

  return (
    <SettingsLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Menú</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {categories.length} categoría{categories.length !== 1 ? 's' : ''} · {totalItems} platillo{totalItems !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setModal({ type: 'category', editing: null })}
            className="bg-indigo-600 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            + Categoría
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : categories.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 text-sm">No hay categorías en el menú.</p>
            <button
              onClick={() => setModal({ type: 'category', editing: null })}
              className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
            >
              Crear primera categoría
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Category header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {cat.items.length}
                    </span>
                    {!cat.isActive && (
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        inactiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModal({
                          type: 'item',
                          editing: null,
                          defaultCategoryId: cat.id,
                        })
                      }}
                      className="text-xs text-indigo-600 font-medium hover:underline"
                    >
                      + Platillo
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModal({ type: 'category', editing: cat })
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        void deleteCategory(cat)
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                    <span className="text-gray-300">{expandedCat === cat.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Items list */}
                {expandedCat === cat.id && (
                  <div className="border-t border-gray-100">
                    {cat.items.length === 0 ? (
                      <p className="text-xs text-gray-400 px-4 py-3">Sin platillos en esta categoría.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-400">
                            <th className="text-left px-4 py-2 font-medium">Nombre</th>
                            <th className="text-right px-4 py-2 font-medium">Precio</th>
                            <th className="text-right px-4 py-2 font-medium">Prep.</th>
                            <th className="text-center px-4 py-2 font-medium">Disponible</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.map((item) => (
                            <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2.5">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-gray-400 truncate max-w-[200px]">
                                    {item.description}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                                ${item.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                                {item.preparationMinutes} min
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => void toggleAvailability(item)}
                                  className={`w-10 h-5 rounded-full transition-colors ${
                                    item.isAvailable ? 'bg-emerald-400' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                                      item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() =>
                                      setModal({
                                        type: 'item',
                                        editing: item,
                                        defaultCategoryId: item.categoryId,
                                      })
                                    }
                                    className="text-xs text-indigo-600 hover:underline"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => void deleteItem(item)}
                                    className="text-xs text-red-400 hover:text-red-600"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.type === 'category' && (
        <CategoryModal
          editing={modal.editing}
          onClose={() => setModal({ type: 'none' })}
          onSave={onCategorySaved}
        />
      )}

      {modal.type === 'item' && (
        <ItemModal
          editing={modal.editing}
          categories={categories}
          defaultCategoryId={modal.defaultCategoryId}
          onClose={() => setModal({ type: 'none' })}
          onSave={onItemSaved}
        />
      )}
    </SettingsLayout>
  )
}
