import { request } from '../../shared/api/client'

export type AttendanceEvent = {
  id: string
  scheduleId: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  receivedAt: string
  locatedAt: string
  latitude: number
  longitude: number
  accuracyMeters: number
  photoUrl: string
}

export function listMyEvents(from: string, to: string) {
  return request<AttendanceEvent[]>('/attendance/events?' + new URLSearchParams({ from, to }))
}

export function recordAttendance(scheduleId: string, type: AttendanceEvent['type'], photo: File, position: GeolocationPosition) {
  const body = new FormData()
  body.set('scheduleId', scheduleId)
  body.set('type', type)
  body.set('photo', photo)
  body.set('latitude', String(position.coords.latitude))
  body.set('longitude', String(position.coords.longitude))
  body.set('accuracyMeters', String(position.coords.accuracy))
  body.set('locatedAt', new Date(position.timestamp).toISOString())
  return request<AttendanceEvent>('/attendance/events', { method: 'POST', body })
}

export type AttendanceResult = {
  scheduleId: string
  employeeId: string
  employeeName: string
  workDate: string
  shiftName: string
  startsAt: string
  endsAt: string
  checkInAt: string | null
  checkOutAt: string | null
  arrival: 'PENDING' | 'ON_TIME' | 'LATE' | 'ABSENT'
  departure: 'PENDING' | 'ON_TIME' | 'EARLY_LEAVE' | 'MISSING_CHECK_OUT'
  overall: 'PENDING' | 'IN_PROGRESS' | 'ON_TIME' | 'LATE' | 'EARLY_LEAVE' | 'LATE_AND_EARLY_LEAVE' | 'ABSENT' | 'MISSING_CHECK_OUT'
  lateMinutes: number
  earlyMinutes: number
}
export type ResultPage = { items: AttendanceResult[]; page: number; size: number; totalElements: number; totalPages: number }
export function listResults(from: string, to: string, page: number) {
  return request<ResultPage>('/attendance/results?' + new URLSearchParams({ from, to, page: String(page), size: '20' }))
}
