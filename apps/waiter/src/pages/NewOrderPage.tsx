import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { MenuCategoryDTO, OrderDTO } from '@tableflow/shared'
import { useAppStore } from '../store/index'
import { api } from '../lib/api'

export default function NewOrderPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()

  const tables = useAppStore((s) => s.tables)
  const menu = useAppStore((s) => s.menu)
  const setMenu = useAppStore((s) => s.setMenu)
  const cart = useAppStore((s) => s.cart)
  const cartNotes = useAppStore((s) => s.cartNotes)
  const setCartTable = useAppStore((s) => s.setCartTable)
  const addToCart = useAppStore((s) => s.addToCart)
  const incrementCart = useAppStore((s) => s.incrementCart)
  const decrementCart = useAppStore((s) => s.decrementCart)
  const updateCartItemNotes = useAppStore((s) => s.updateCartItemNotes)
  const setCartNotes = useAppStore((s) => s.setCartNotes)
  const clearCart = useAppStore((s) => s.clearCart)
  const upsertOrder = useAppStore((s) => s.upsertOrder)
  const updateTableStatus = useAppStore((s) => s.updateTableStatus)

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const table = tables.find((t) => t.id === tableId)
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    if (tableId) setCartTable(tableId)
  }, [tableId, setCartTable])

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
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [menu, setMenu, activeCategory])

  async function handleConfirm() {
    if (!tableId || cart.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post<{ data: OrderDTO }>('/orders', {
        tableId,
        items: cart.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
        notes: cartNotes || undefined,
      })
      upsertOrder(res.data)
      updateTableStatus(tableId, 'occupied')
      clearCart()
      navigate(`/orders/${res.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden')
    } finally {
      setSubmitting(false)
    }
  }

  const currentItems =
    menu?.find((c) => c.id === activeCategory)?.items ?? []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-600 text-white px-4 pt-10 pb-4 shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { clearCart(); navigate('/tables') }}
            className="text-2xl active:opacity-70"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {table ? `Mesa ${table.number}` : 'Nueva orden'}
            </h1>
            {table?.name && <p className="text-green-100 text-sm">{table.name}</p>}
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

      {/* Lista de platillos */}
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
                  {/* Info */}
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => item.isAvailable && setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-semibold text-base ${
                          !item.isAvailable ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      >
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
                    <p className="text-green-600 font-bold mt-0.5">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Selector de cantidad */}
                  {item.isAvailable && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => decrementCart(item.id)}
                            className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center active:bg-gray-200"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-lg">{qty}</span>
                          <button
                            onClick={() => incrementCart(item.id)}
                            className="w-9 h-9 rounded-full bg-green-600 text-white text-xl font-bold flex items-center justify-center active:bg-green-700"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            addToCart({ menuItemId: item.id, name: item.name, price: item.price })
                          }
                          className="w-9 h-9 rounded-full bg-green-600 text-white text-2xl font-bold flex items-center justify-center active:bg-green-700"
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Notas del item (expandible) */}
                {isExpanded && qty > 0 && (
                  <div className="px-4 pb-3">
                    <input
                      type="text"
                      value={cartItem?.notes ?? ''}
                      onChange={(e) => updateCartItemNotes(item.id, e.target.value)}
                      placeholder="Notas: sin cebolla, término medio..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Barra inferior — carrito */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
          {/* Notas de la orden */}
          <input
            type="text"
            value={cartNotes}
            onChange={(e) => setCartNotes(e.target.value)}
            placeholder="Nota general de la orden..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full bg-green-600 text-white rounded-2xl py-4 flex items-center justify-between px-5 active:bg-green-700 disabled:opacity-60"
          >
            <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-sm font-bold">
              {cartCount}
            </span>
            <span className="font-bold text-lg">
              {submitting ? 'Enviando...' : 'Confirmar orden'}
            </span>
            <span className="font-semibold">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
