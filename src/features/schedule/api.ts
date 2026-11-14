import { request } from '../../shared/api/client'
import type { Page, Shift, ShiftInput, WorkSchedule, PublishScheduleInput, PublishScheduleResult } from './types'

export const listShifts = (page = 0) => request<Page<Shift>>('/shift-templates?' + new URLSearchParams({ page: String(page), size: '20' }))
export const createShift = (body: ShiftInput) => request<Shift>('/shift-templates', { method: 'POST', body: JSON.stringify(body) })
export const listSchedules = (from: string, to: string, page = 0) => request<Page<WorkSchedule>>('/work-schedules?' + new URLSearchParams({ from, to, page: String(page), size: '20' }))
export const assignShift = (employeeId: string, shiftTemplateId: string, workDate: string) => request<WorkSchedule>('/work-schedules', { method: 'POST', body: JSON.stringify({ employeeId, shiftTemplateId, workDate }) })
export const reassignSchedule = (id: string, employeeId: string, shiftTemplateId: string, workDate: string) => request<WorkSchedule>('/work-schedules/' + id, { method: 'PUT', body: JSON.stringify({ employeeId, shiftTemplateId, workDate }) })
export const publishSchedule = (body: PublishScheduleInput) => request<PublishScheduleResult>('/work-schedules/publish', { method: 'POST', body: JSON.stringify(body) })
export const cancelSchedule = (id: string) => request<void>('/work-schedules/' + id, { method: 'DELETE' })
