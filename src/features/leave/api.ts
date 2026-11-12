import { request } from '../../shared/api/client'
import type { CreateLeaveInput, LeaveQuota, LeaveRequest, PageResponse, ReviewLeaveInput } from './types'

export const getLeaveQuota = (month?: string) =>
  request<LeaveQuota>('/leave-requests/quota' + (month ? '?month=' + encodeURIComponent(month) : ''))

export const getMyLeaves = () =>
  request<LeaveRequest[]>('/leave-requests/me')

export const submitLeave = (input: CreateLeaveInput) =>
  request<LeaveRequest>('/leave-requests', {
    method: 'POST',
    body: JSON.stringify(input)
  })

export const listLeaveRequests = (params?: {
  status?: string
  from?: string
  to?: string
  employeeId?: string
  page?: number
  size?: number
}) => {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.employeeId) query.set('employeeId', params.employeeId)
  if (params?.page !== undefined) query.set('page', String(params.page))
  if (params?.size !== undefined) query.set('size', String(params.size))
  return request<PageResponse<LeaveRequest>>('/leave-requests?' + query.toString())
}

export const reviewLeave = (id: string, input: ReviewLeaveInput) =>
  request<LeaveRequest>('/leave-requests/' + id + '/review', {
    method: 'PUT',
    body: JSON.stringify(input)
  })
