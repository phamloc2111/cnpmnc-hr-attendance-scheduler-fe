const storageKey = 'shiftsync.session'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
export function clearSession() {
  sessionStorage.removeItem(storageKey)
  window.dispatchEvent(new Event('session-expired'))
}
export function readSession(): { accessToken: string; expiresAt: string } | null {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (stored && typeof stored === 'object' && 'accessToken' in stored && 'expiresAt' in stored
      && typeof stored.accessToken === 'string' && typeof stored.expiresAt === 'string'
      && Date.parse(stored.expiresAt) > Date.now()) {
      return { accessToken: stored.accessToken, expiresAt: stored.expiresAt }
    }
  } catch { /* Damaged sessions are treated as signed out. */ }
  sessionStorage.removeItem(storageKey)
  return null
}
export function saveSession(session: { accessToken: string; expiresAt: string }) {
  sessionStorage.setItem(storageKey, JSON.stringify({ accessToken: session.accessToken, expiresAt: session.expiresAt }))
}
export async function request<T>(path: string, options: RequestInit = {}, anonymous = false): Promise<T> {
  const headers = new Headers(options.headers)
  const session = anonymous ? null : readSession()
  if (session) headers.set('Authorization', 'Bearer ' + session.accessToken)
  if (options.body) headers.set('Content-Type', 'application/json')
  let response: Response
  try { response = await fetch(apiBaseUrl + '/api/v1' + path, { ...options, headers, cache: 'no-store' }) }
  catch { throw new ApiError(0, 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.') }
  if (!response.ok) {
    let message = response.status === 403 ? 'Bạn không có quyền truy cập chức năng này' : 'Yêu cầu không thành công. Vui lòng thử lại.'
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') message = body.message
    } catch { /* Keep the fallback for a non-JSON gateway error. */ }
    if (response.status === 401 && !anonymous) clearSession()
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
