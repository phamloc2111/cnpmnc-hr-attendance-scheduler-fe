export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  scheduleId?: string
  workDate: string
  shiftTemplateId?: string
  shiftName: string
  reason: string
  status: LeaveStatus
  reviewerId?: string
  reviewerName?: string
  reviewerNote?: string
  reviewedAt?: string
  createdAt: string
}

export interface LeaveQuota {
  month: string
  maxAllowed: number
  approved: number
  pending: number
  remaining: number
  canSubmit: boolean
}

export interface CreateLeaveInput {
  scheduleId?: string
  workDate: string
  shiftTemplateId?: string
  reason: string
}

export interface ReviewLeaveInput {
  action: 'APPROVE' | 'REJECT'
  note?: string
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
