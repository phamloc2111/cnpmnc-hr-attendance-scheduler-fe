export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export type Shift = { id: string; name: string; startTime: string; endTime: string; breakMinutes: number; workingMinutes: number; overnight: boolean; requiredHeadcount: number; requiredPosition: string | null; requiredPositionId: string | null }
export type WorkSchedule = { id: string; employeeId: string; employeeName: string; shiftTemplateId: string; workDate: string; shiftName: string; startsAt: string; endsAt: string; breakMinutes: number; workingMinutes: number; timezone: string; requiredPosition?: string | null; draft?: boolean }
export type ShiftInput = { name: string; startTime: string; endTime: string; breakMinutes: number; requiredHeadcount: number; requiredPositionId: string; overnight: boolean }
export type GenerationInput = { weekStart: string; shiftTemplateIds: string[]; workDates: string[] }
export type GenerationResult = { weekStart: string; createdCount: number; maxWeeklyMinutes: number; minWeeklyMinutes: number; belowMinimumEmployeeCount: number; items: WorkSchedule[] }
export type DraftShortage = { workDate: string; shiftTemplateId: string; shiftName: string; missingCount: number }
export type DraftGenerationResult = { weekStart: string; createdCount: number; missingCount: number; shortages: DraftShortage[]; items: WorkSchedule[] }
