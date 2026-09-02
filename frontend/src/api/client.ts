type ErrorEnvelope = { error?: { code?: string; message?: string } }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code = 'request_failed') {
    super(message)
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorEnvelope
    throw new ApiError(body.error?.message ?? 'The request could not be completed.', response.status, body.error?.code)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
