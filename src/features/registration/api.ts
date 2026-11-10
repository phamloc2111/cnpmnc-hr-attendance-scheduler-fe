import { request } from '../../shared/api/client'

export interface RegistrationShift {
  id: string; name: string; startTime: string; endTime: string
  breakMinutes: number; workingMinutes: number; overnight: boolean; requiredPosition: string | null
}
export interface RegistrationWeek {
  weekStart: string; weekEnd: string; serverNow: string; opensAt: string; closesAt: string
  editable: boolean; revision: string; shifts: RegistrationShift[]
}
export interface ShiftCatalog {
  items: RegistrationShift[]; page: number; size: number; totalElements: number; totalPages: number
}
export const loadRegistration = (week: string, signal?: AbortSignal) => request<RegistrationWeek>('/registrations/me' + (week ? '?weekStart=' + week : ''), { signal })
export const loadCatalog = (page: number, signal?: AbortSignal) => request<ShiftCatalog>('/registrations/shifts?page=' + page + '&size=20', { signal })
export const saveRegistration = (weekStart: string, revision: string, shiftIds: string[]) => request<RegistrationWeek>('/registrations/me', { method: 'PUT', body: JSON.stringify({ weekStart, revision, shiftIds }) })

// The server supplies the clock and window; the device wall clock is never authoritative.
export function canEdit(week: RegistrationWeek, elapsedMilliseconds: number) {
  const now = Date.parse(week.serverNow) + Math.max(0, elapsedMilliseconds)
  return week.editable && now >= Date.parse(week.opensAt) && now < Date.parse(week.closesAt)
}
export function sameSelection(selected: RegistrationShift[], saved: RegistrationShift[]) {
  const ids = new Set(selected.map(shift => shift.id))
  return ids.size === saved.length && saved.every(shift => ids.has(shift.id))
}
