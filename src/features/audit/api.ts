import { request } from '../../shared/api/client'
import type { AuditLogItem, AuditPageResponse } from './types'

export function listAuditLogs(params?: {
  actorId?: string
  employeeId?: string
  category?: string
  from?: string
  to?: string
  page?: number
  size?: number
}) {
  const query = new URLSearchParams()
  if (params?.actorId) query.set('actorId', params.actorId)
  if (params?.employeeId) query.set('employeeId', params.employeeId)
  if (params?.category) query.set('category', params.category)
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.page !== undefined) query.set('page', String(params.page))
  if (params?.size !== undefined) query.set('size', String(params.size))
  const suffix = query.toString()
  return request<AuditPageResponse<AuditLogItem>>('/audit-logs' + (suffix ? '?' + suffix : ''))
}
