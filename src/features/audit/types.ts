export type AuditCategory = 'SCHEDULE' | 'ATTENDANCE'

export interface AuditLogItem {
  id: string
  actorId: string
  actorName: string
  targetEmployeeId?: string | null
  targetEmployeeName?: string | null
  targetDate: string
  category: AuditCategory
  action: string
  summary: string
  oldValue?: string | null
  newValue?: string | null
  occurredAt: string
}

export interface AuditPageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
