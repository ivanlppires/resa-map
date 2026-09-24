import type { Dataset, SessionUser } from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init })
  if (!res.ok) {
    let msg = res.statusText
    try { msg = (await res.json()).error ?? msg } catch { /* ignore */ }
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  me: () => request<{ user: SessionUser }>('/api/auth/me'),
  login: (email: string, password: string) => request<{ user: SessionUser }>('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  data: () => request<Dataset>('/api/data'),
}

export function exportUrl(kind: 'csv' | 'xlsx' | 'geojson' | 'pdf', ids: number[], extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ids: ids.join(','), ...extra })
  const base = kind === 'pdf' ? '/api/report.pdf' : `/api/export.${kind}`
  return `${base}?${params.toString()}`
}
