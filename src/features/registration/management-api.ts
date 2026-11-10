import { request } from '../../shared/api/client'

export interface ManagedEmployee {
  employeeId: string; displayName: string; accountLocked: boolean; selectionCount: number
  state: 'OPEN' | 'CLOSED' | 'REOPENED' | 'NOT_OPEN' | 'ACCOUNT_LOCKED'
  reopenedAt: string | null; accessRevision: string; canReopen: boolean; canClose: boolean
}
export interface ManagedWeek {
  weekStart: string; weekEnd: string; serverNow: string; opensAt: string; closesAt: string
  items: ManagedEmployee[]; page: number; size: number; totalElements: number; totalPages: number
}
export function loadManagedRegistrations(week: string, q: string, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, page: String(page), size: '20' }); if (week) params.set('weekStart', week)
  return request<ManagedWeek>('/registrations/management?' + params, { signal })
}
export const changeRegistrationAccess = (employeeId: string, weekStart: string, reopened: boolean, accessRevision: string) => request<ManagedEmployee>('/registrations/management/' + employeeId + '/access', { method: 'PUT', body: JSON.stringify({ weekStart, reopened, accessRevision }) })
