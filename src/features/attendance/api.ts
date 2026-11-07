import { request } from '../../shared/api/client'
import type { AttendanceFilter, AttendancePageResponse, AttendanceRecord } from './types'

export function listAttendanceRecords(filter: AttendanceFilter = {}) {
  const query = new URLSearchParams({
    page: String(filter.page ?? 0),
    size: String(filter.size ?? 20),
  })
  if (filter.from) query.set('from', filter.from)
  if (filter.to) query.set('to', filter.to)
  if (filter.employeeId) query.set('employeeId', filter.employeeId)
  if (filter.status) query.set('status', filter.status)
  if (filter.checkType) query.set('checkType', filter.checkType)
  return request<AttendancePageResponse>('/attendance-records?' + query.toString())
}

export function getAttendanceRecord(id: string) {
  return request<AttendanceRecord>('/attendance-records/' + id)
}
