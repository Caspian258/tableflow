import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store/index'
import type { BillingStatus } from '../store/index'
import { api } from '../lib/api'

const PLANS = [
  {
    id: 'basic' as const,
    name: 'Basic',
    price: '$299',
    period: '/mes',
    description: 'Ideal para restaurantes pequeños',
    features: [
      'Hasta 20 mesas',
      'App de meseros (PWA)',
      'KDS de cocina',
      'Órdenes ilimitadas',
      'Soporte por email',
    ],
    color: 'border-gray-200',
    badge: null,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$599',
    period: '/mes',
    description: 'Para restaurantes que quieren crecer',
    features: [
      'Mesas ilimitadas',
      'Todo lo de Basic',
      'Analytics avanzados',
      'Múltiples sucursales',
      'Soporte prioritario',
      'Exportar reportes',
    ],
    color: 'border-indigo-500',
    badge: 'Más popular',
  },
]

export default function BillingPage() {
  const navigate = useNavigate()
  const { billing, setBilling } = useAdminStore()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<{ data: BillingStatus }>('/billing/status')
      .then((res) => setBilling(res.data))
      .catch(() => {})
  }, [setBilling])

  async function handleUpgrade(plan: 'basic' | 'pro') {
    setError('')
    setLoadingPlan(plan)
    try {
      const successUrl = `${window.location.origin}/billing?success=1`
      const cancelUrl = `${window.location.origin}/billing`
      const res = await api.post<{ data: { url: string } }>('/billing/create-checkout', {
        plan,
        successUrl,
        cancelUrl,
      })
      window.location.href = res.data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Dashboard
        </button>
        <h1 className="text-lg font-bold text-gray-900">Planes y facturación</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Status actual */}
        {billing && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Suscripción actual</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={billing.status} plan={billing.plan} />
              {billing.trialDaysRemaining !== null && (
                <span className="text-sm text-gray-600">
                  {billing.trialDaysRemaining} días restantes de prueba
                </span>
              )}
              {billing.currentPeriodEnd && billing.status === 'active' && (
                <span className="text-sm text-gray-500">
                  Próximo cobro:{' '}
                  {new Date(billing.currentPeriodEnd).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Planes */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Elige tu plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan) => {
              const isCurrent =
                billing?.plan === plan.id && billing.status === 'active'

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col ${plan.color} relative`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-indigo-500 font-bold">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl border-2 border-indigo-200 text-indigo-400 text-sm font-semibold cursor-default"
                    >
                      Plan actual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loadingPlan !== null}
                      className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                        plan.id === 'pro'
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {loadingPlan === plan.id ? 'Redirigiendo...' : `Elegir ${plan.name}`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Los precios son en MXN e incluyen IVA. Puedes cancelar en cualquier momento.
        </p>
      </main>
    </div>
  )
}

function StatusBadge({ status, plan }: { status: BillingStatus['status']; plan: BillingStatus['plan'] }) {
  const map: Record<string, { label: string; className: string }> = {
    trialing: { label: 'Trial', className: 'bg-amber-100 text-amber-700' },
    active: { label: plan === 'basic' ? 'Basic' : 'Pro', className: 'bg-emerald-100 text-emerald-700' },
    past_due: { label: 'Pago pendiente', className: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600' },
  }
  const { label, className } = map[status] ?? map.trialing
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}>{label}</span>
  )
}
