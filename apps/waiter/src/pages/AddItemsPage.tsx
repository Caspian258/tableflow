import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { MenuCategoryDTO, OrderDTO } from '@tableflow/shared'
import { useAppStore } from '../store/index'
import { api } from '../lib/api'

interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes: string
}

export default function AddItemsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const orders = useAppStore((s) => s.orders)
  const tables = useAppStore((s) => s.tables)
  const menu = useAppStore((s) => s.menu)
  const setMenu = useAppStore((s) => s.setMenu)
  const upsertOrder = useAppStore((s) => s.upsertOrder)

  const order = orders.find((o) => o.id === orderId)
  const table = tables.find((t) => t.id === order?.tableId)

  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    if (menu) {
      if (!activeCategory && menu.length > 0) setActiveCategory(menu[0].id)
      return
    }
    setLoading(true)
    api
      .get<{ data: MenuCategoryDTO[] }>('/menu')
      .then((res) => {
        setMenu(res.data)
        if (res.data.length > 0) setActiveCategory(res.data[0].id)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [menu, setMenu, activeCategory])

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }]
    })
  }

  function decrement(menuItemId: string) {
    setCart((prev) =>
      prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c)
        .filter((c) => c.quantity > 0)
    )
  }

  function increment(menuItemId: string) {
    setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + 1 } : c))
  }

  async function handleConfirm() {
    if (!orderId || cart.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.patch<{ data: OrderDTO }>(`/orders/${orderId}/items`, {
        add: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
      })
      upsertOrder(res.data)
      navigate(`/orders/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agregar platillos')
    } finally {
      setSubmitting(false)
    }
  }

  const currentItems = menu?.find((c) => c.id === activeCategory)?.items ?? []

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Orden no encontrada
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-600 text-white px-4 pt-10 pb-4 shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/orders/${orderId}`)}
            className="text-2xl active:opacity-70"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold">
              Agregar a Mesa {order.tableNumber}
              {table?.name ? ` — ${table.name}` : ''}
            </h1>
            <p className="text-green-100 text-sm">Selecciona platillos adicionales</p>
          </div>
        </div>
      </header>

      {/* Tabs de categorías */}
      {menu && menu.length > 0 && (
        <div className="bg-white border-b border-gray-200 overflow-x-auto">
          <div className="flex px-2 py-2 gap-2 min-w-max">
            {menu.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-36">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-400">Cargando menú...</p>
          </div>
        )}
        {error && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {currentItems.map((item) => {
            const cartItem = cart.find((c) => c.menuItemId === item.id)
            const qty = cartItem?.quantity ?? 0
            const isExpanded = expandedItem === item.id

            return (
              <div key={item.id} className="bg-white">
                <div className="flex items-center px-4 py-3 gap-3">
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => item.isAvailable && setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-base ${!item.isAvailable ? 'text-gray-400' : 'text-gray-900'}`}>
                        {item.name}
                      </p>
                      {!item.isAvailable && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                          Agotado
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 truncate">{item.description}</p>
                    )}
                    <p className="text-green-600 font-bold mt-0.5">${item.price.toFixed(2)}</p>
                  </div>

                  {item.isAvailable && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => decrement(item.id)}
                            className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center active:bg-gray-200"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-lg">{qty}</span>
                          <button
                            onClick={() => increment(item.id)}
                            className="w-9 h-9 rounded-full bg-green-600 text-white text-xl font-bold flex items-center justify-center active:bg-green-700"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })}
                          className="w-9 h-9 rounded-full bg-green-600 text-white text-2xl font-bold flex items-center justify-center active:bg-green-700"
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && qty > 0 && (
                  <div className="px-4 pb-3">
                    <input
                      type="text"
                      value={cartItem?.notes ?? ''}
                      onChange={(e) =>
                        setCart((prev) =>
                          prev.map((c) =>
                            c.menuItemId === item.id ? { ...c, notes: e.target.value } : c
                          )
                        )
                      }
                      placeholder="Notas: sin cebolla, término medio..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Barra inferior */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
          <button
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="w-full bg-green-600 text-white rounded-2xl py-4 flex items-center justify-between px-5 active:bg-green-700 disabled:opacity-60"
          >
            <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-sm font-bold">
              {cartCount}
            </span>
            <span className="font-bold text-lg">
              {submitting ? 'Enviando...' : 'Agregar a la orden'}
            </span>
            <span className="font-semibold">+${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
