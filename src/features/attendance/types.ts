export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT'
export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'REJECTED'
export type FraudType = 'STALE_PHOTO' | 'DUPLICATE_PHOTO' | 'FAKE_LOCATION' | 'UNREGISTERED_DEVICE'

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
  photoHash?: string | null
  photoCapturedAt: string | null
  photoLocation: string
  deviceLocation: string
  deviceLatitude: number | null
  deviceLongitude: number | null
  deviceId?: string | null
  deviceName?: string | null
  mockLocation?: boolean
  fraudType?: FraudType | null
  status: AttendanceStatus
  verificationNote: string | null
}

export type RegisteredDevice = {
  employeeId: string
  employeeName: string
  deviceId: string
  deviceName: string | null
  registeredAt: string
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

export const fraudTypeLabels: Record<FraudType, string> = {
  STALE_PHOTO: 'Từ chối: Ảnh cũ',
  DUPLICATE_PHOTO: 'Từ chối: Ảnh dùng lại',
  FAKE_LOCATION: 'Cảnh báo: Định vị giả',
  UNREGISTERED_DEVICE: 'Từ chối: Thiết bị lạ',
}

export type AttendanceEvent = {
  id: string; scheduleId: string; type: AttendanceType; receivedAt: string; locatedAt: string
  latitude: number; longitude: number; accuracyMeters: number; photoUrl: string
}
export type ResultStatus = 'PENDING' | 'ON_TIME' | 'LATE' | 'ABSENT' | 'EARLY_LEAVE' | 'MISSING_CHECK_OUT' | 'IN_PROGRESS' | 'LATE_AND_EARLY_LEAVE'
export type AttendanceResult = {
  scheduleId: string; employeeId: string; employeeName: string; workDate: string; shiftName: string
  startsAt: string; endsAt: string; checkInAt: string | null; checkOutAt: string | null
  arrival: ResultStatus; departure: ResultStatus; overall: ResultStatus; lateMinutes: number; earlyMinutes: number; explanationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
}
export type AttendanceResultPage = { items: AttendanceResult[]; page: number; size: number; totalElements: number; totalPages: number }
export const resultLabels: Record<ResultStatus, string> = {
  PENDING: 'Chờ điểm danh', ON_TIME: 'Đúng giờ', LATE: 'Trễ', ABSENT: 'Vắng', EARLY_LEAVE: 'Về sớm',
  MISSING_CHECK_OUT: 'Thiếu lượt ra', IN_PROGRESS: 'Đang trong ca', LATE_AND_EARLY_LEAVE: 'Trễ và về sớm',
}
