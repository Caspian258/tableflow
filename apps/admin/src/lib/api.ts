import { useAdminStore } from '../store/index'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAdminStore.getState().accessToken

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!refreshRes.ok) {
      useAdminStore.getState().logout()
      throw new Error('Sesión expirada')
    }
    const { data } = (await refreshRes.json()) as { data: { accessToken: string } }
    useAdminStore.getState().setAccessToken(data.accessToken)

    const retryRes = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.accessToken}`,
        ...(options.headers as Record<string, string> | undefined),
      },
    })
    if (!retryRes.ok) {
      const err = (await retryRes.json()) as { error: string }
      throw new Error(err.error ?? 'Error del servidor')
    }
    return retryRes.json() as Promise<T>
  }

  if (!res.ok) {
    const err = (await res.json()) as { error: string }
    throw new Error(err.error ?? 'Error del servidor')
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}
