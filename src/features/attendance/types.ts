export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT'
export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'REJECTED'

export type AttendanceRecord = {
  id: string
  employeeId: string
  employeeName: string
  scheduleId: string | null
  workDate: string
  shiftName: string
  checkType: AttendanceType
  recordedAt: string
  photoUrl: string
  photoCapturedAt: string | null
  photoLocation: string
  deviceLocation: string
  deviceLatitude: number | null
  deviceLongitude: number | null
  status: AttendanceStatus
  verificationNote: string | null
}

export type AttendancePageResponse = {
  items: AttendanceRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type AttendanceFilter = {
  from?: string
  to?: string
  employeeId?: string
  status?: AttendanceStatus | ''
  checkType?: AttendanceType | ''
  page?: number
  size?: number
}

export const attendanceTypeLabels: Record<AttendanceType, string> = {
  CHECK_IN: 'Vào ca',
  CHECK_OUT: 'Ra ca',
}

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  ON_TIME: 'Đúng giờ',
  LATE: 'Đi trễ',
  EARLY_LEAVE: 'Về sớm',
  ABSENT: 'Vắng',
  REJECTED: 'Không hợp lệ',
}
