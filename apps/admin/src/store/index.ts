import { create } from 'zustand'
import type { AuthUser } from '@tableflow/shared'

// ─── Tipos de analytics ───────────────────────────────────────────────────────

export interface SalesSummary {
  totalRevenue: number
  totalOrders: number
  avgTicket: number
}

export interface SalesByDay {
  date: string
  revenue: number
  orders: number
}

export interface TopItem {
  rank: number
  menuItemId: string
  name: string
  quantity: number
  revenue: number
}

export interface PeakHour {
  hour: number
  orders: number
}

export interface PrepTimesData {
  averageMinutes: number
  p50Minutes: number
  p90Minutes: number
  sampleSize: number
}

// ─── Store ────────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

interface AdminStore {
  // Auth
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  setAccessToken: (token: string) => void
  logout: () => void

  // Date range
  from: string
  to: string
  setDateRange: (from: string, to: string) => void

  // Analytics data
  summary: SalesSummary | null
  byDay: SalesByDay[]
  topItems: TopItem[]
  peakHours: PeakHour[]
  prepTimes: PrepTimesData | null
  loading: boolean
  error: string

  setSales: (summary: SalesSummary, byDay: SalesByDay[]) => void
  setTopItems: (items: TopItem[]) => void
  setPeakHours: (hours: PeakHour[]) => void
  setPrepTimes: (data: PrepTimesData) => void
  setLoading: (v: boolean) => void
  setError: (e: string) => void
}

export const useAdminStore = create<AdminStore>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      summary: null,
      byDay: [],
      topItems: [],
      peakHours: [],
      prepTimes: null,
    }),

  from: daysAgo(30),
  to: today(),
  setDateRange: (from, to) => set({ from, to }),

  summary: null,
  byDay: [],
  topItems: [],
  peakHours: [],
  prepTimes: null,
  loading: false,
  error: '',

  setSales: (summary, byDay) => set({ summary, byDay }),
  setTopItems: (topItems) => set({ topItems }),
  setPeakHours: (peakHours) => set({ peakHours }),
  setPrepTimes: (prepTimes) => set({ prepTimes }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
