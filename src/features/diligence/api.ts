import { request } from '../../shared/api/client'

export interface Policy { initialScore: number; rewardThreshold: number; graceMinutes: number; under15Penalty: number; under30Penalty: number; from30Penalty: number }
export interface Summary { employeeId: string; employeeName: string; accountLocked: boolean; score: number; deductedPoints: number; checkInCount: number; lateCount: number; rewardStatus: 'ELIGIBLE' | 'INELIGIBLE' }
export interface Entry { scheduleId: string; workDate: string; shiftName: string; startsAt: string; checkInAt: string; lateSeconds: number; deductedPoints: number }
interface Month { month: string; timezone: string; finalized: boolean; asOf: string; policy: Policy; page: number; size: number; totalElements: number; totalPages: number }
export interface MonthPage extends Month { items: Summary[] }
export interface EmployeeMonth extends Month { employee: Summary; items: Entry[] }
export function loadDiligence(month: string, q: string, page: number, signal: AbortSignal) {
  return request<MonthPage>('/diligence?' + new URLSearchParams({ month, q, page: String(page), size: '20' }), { signal })
}
export function loadEmployeeDiligence(id: string, month: string, page: number, signal: AbortSignal) {
  return request<EmployeeMonth>('/diligence/employees/' + encodeURIComponent(id) + '?' + new URLSearchParams({ month, page: String(page), size: '20' }), { signal })
}
