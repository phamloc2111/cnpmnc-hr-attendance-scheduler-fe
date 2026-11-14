import { request } from '../../shared/api/client'
import type { AttendanceFilter, AttendancePageResponse, AttendanceRecord, RegisteredDevice, AttendanceEvent, AttendanceType, AttendanceResultPage } from './types'

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

export function listRegisteredDevices() {
  return request<RegisteredDevice[]>('/attendance-records/devices')
}

export function registerEmployeeDevice(employeeId: string, deviceId: string, deviceName: string) {
  return request<RegisteredDevice>('/attendance-records/devices/' + employeeId, {
    method: 'PUT',
    body: JSON.stringify({ deviceId: deviceId.trim(), deviceName: deviceName.trim() || null }),
  })
}

export function resetEmployeeDevice(employeeId: string) {
  return request<void>('/attendance-records/devices/' + employeeId, {
    method: 'DELETE',
  })
}

export function listMyAttendance(from: string, to: string) {
  return request<AttendanceEvent[]>('/attendance/events?' + new URLSearchParams({ from, to }))
}
export function sendAttendance(scheduleId: string, type: AttendanceType, photo: Blob | File) {
  const body = new FormData()
  body.set('scheduleId', scheduleId)
  body.set('type', type)
  body.set('photo', photo, photo instanceof File ? photo.name : 'timemark.jpg')
  return request<AttendanceEvent>('/attendance/events', { method: 'POST', body })
}
export function listAttendanceResults(from: string, to: string, page = 0) {
  return request<AttendanceResultPage>('/attendance/results?' + new URLSearchParams({ from, to, page: String(page), size: '20' }))
}
