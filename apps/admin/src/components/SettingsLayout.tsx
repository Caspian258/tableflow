import { NavLink, useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store/index'

const NAV_ITEMS = [
  { to: '/settings/restaurant', label: 'Restaurante', icon: '🏠' },
  { to: '/settings/tables', label: 'Mesas', icon: '🪑' },
  { to: '/settings/menu', label: 'Menú', icon: '📋' },
  { to: '/settings/staff', label: 'Personal', icon: '👥' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const user = useAdminStore((s) => s.user)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
          >
            ← Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h1 className="text-lg font-bold text-gray-900">Configuración</h1>
          </div>
        </div>
        <p className="text-xs text-gray-400">{user?.name}</p>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-52 flex-shrink-0">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
