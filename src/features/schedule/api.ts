import { request } from '../../shared/api/client'
import type { DraftGenerationResult, DraftWarnings, Page, Shift, ShiftInput, WorkSchedule } from './types'
export const listShifts = (page = 0) => request<Page<Shift>>('/shift-templates?' + new URLSearchParams({ page: String(page), size: '20' }))
export const createShift = (body: ShiftInput) => request<Shift>('/shift-templates', { method: 'POST', body: JSON.stringify(body) })
export const listSchedules = (from: string, to: string, page = 0) => request<Page<WorkSchedule>>('/work-schedules?' + new URLSearchParams({ from, to, page: String(page), size: '20' }))
export const assignShift = (employeeId: string, shiftTemplateId: string, workDate: string) => request<WorkSchedule>('/work-schedules', { method: 'POST', body: JSON.stringify({ employeeId, shiftTemplateId, workDate }) })
export const assignDraftShift = (employeeId: string, shiftTemplateId: string, workDate: string) => request<WorkSchedule>('/work-schedules/draft-assignments', { method: 'POST', body: JSON.stringify({ employeeId, shiftTemplateId, workDate }) })
export const cancelSchedule = (id: string) => request<void>('/work-schedules/' + id, { method: 'DELETE' })
export const generateWeeklyDraft = (weekStart: string) => request<DraftGenerationResult>('/work-schedules/drafts', { method: 'POST', body: JSON.stringify({ weekStart }) })
export const getDraftWarnings = (weekStart: string) => request<DraftWarnings>('/work-schedules/draft-warnings?' + new URLSearchParams({ weekStart }))
