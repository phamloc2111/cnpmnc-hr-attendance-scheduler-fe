export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export type Shift = { id: string; name: string; startTime: string; endTime: string; breakMinutes: number; workingMinutes: number; overnight: boolean }
export type WorkSchedule = { id: string; employeeId: string; employeeName: string; shiftTemplateId: string; workDate: string; shiftName: string; startsAt: string; endsAt: string; breakMinutes: number; workingMinutes: number; timezone: string }
export type ShiftInput = { name: string; startTime: string; endTime: string; breakMinutes: number }
