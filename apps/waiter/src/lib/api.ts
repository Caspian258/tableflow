import { useAppStore } from '../store/index'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAppStore.getState().accessToken

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  // Intentar refresh si 401
  if (res.status === 401) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!refreshRes.ok) {
      useAppStore.getState().logout()
      throw new Error('Sesión expirada. Por favor vuelve a iniciar sesión.')
    }

    const { data } = (await refreshRes.json()) as { data: { accessToken: string } }
    useAppStore.getState().setAccessToken(data.accessToken)

    // Reintentar la petición original con el nuevo token
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
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
