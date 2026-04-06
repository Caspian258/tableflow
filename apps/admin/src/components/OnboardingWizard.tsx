import { useNavigate } from 'react-router-dom'

export interface OnboardingStatus {
  hasTables: boolean
  hasMenu: boolean
  hasStaff: boolean
  isComplete: boolean
}

interface Step {
  key: keyof Omit<OnboardingStatus, 'isComplete'>
  label: string
  description: string
  icon: string
  link: string
}

const STEPS: Step[] = [
  {
    key: 'hasTables',
    label: 'Agregar mesas',
    description: 'Configura las mesas de tu restaurante.',
    icon: '🪑',
    link: '/settings/tables',
  },
  {
    key: 'hasMenu',
    label: 'Crear menú',
    description: 'Agrega categorías y platillos.',
    icon: '📋',
    link: '/settings/menu',
  },
  {
    key: 'hasStaff',
    label: 'Agregar personal',
    description: 'Crea usuarios para meseros y cocina.',
    icon: '👥',
    link: '/settings/staff',
  },
]

export default function OnboardingWizard({ status }: { status: OnboardingStatus }) {
  const navigate = useNavigate()

  if (status.isComplete) return null

  const completedCount = STEPS.filter((s) => status[s.key]).length

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Configura tu restaurante</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Completa estos pasos para empezar a tomar órdenes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 font-medium">{completedCount}/3</div>
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <div
                key={s.key}
                className={`w-2 h-2 rounded-full transition-colors ${
                  status[s.key] ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step, idx) => {
          const done = status[step.key]
          return (
            <button
              key={step.key}
              onClick={() => navigate(step.link)}
              disabled={done}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                done
                  ? 'bg-emerald-50 border-emerald-100 cursor-default'
                  : 'bg-gray-50 border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  done ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-gray-200 text-gray-400'
                }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-gray-900'
                  }`}
                >
                  {step.icon} {step.label}
                </p>
                {!done && <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>}
              </div>
              {!done && <span className="text-gray-300 text-sm">→</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
