import { describe, expect, it } from 'vitest'
import { calendarSegments } from './week-calendar'
import type { WorkSchedule } from './types'

function shift(id: string, from: string, to: string): WorkSchedule {
  return { id, employeeId: 'employee', employeeName: 'An', shiftTemplateId: 'template', workDate: from.slice(0, 10), shiftName: 'Ca', startsAt: from + '+07:00', endsAt: to + '+07:00', breakMinutes: 0, workingMinutes: 60, timezone: 'Asia/Ho_Chi_Minh' }
}
describe('Vietnam weekly calendar geometry', () => {
  it('places partial hours at their exact minute offsets', () => {
    expect(calendarSegments('2026-11-02', [shift('a', '2026-11-02T07:30:00', '2026-11-02T09:00:00')])[0]).toMatchObject({ day: 0, start: 450, end: 540 })
  })
  it('splits overnight shifts and includes carryover from the previous week', () => {
    const parts = calendarSegments('2026-11-02', [shift('a', '2026-11-01T22:00:00', '2026-11-02T06:00:00'), shift('b', '2026-11-05T22:00:00', '2026-11-06T06:00:00')])
    expect(parts.map(({ day, start, end, before, after }) => ({ day, start, end, before, after }))).toEqual([
      { day: 0, start: 0, end: 360, before: true, after: false },
      { day: 3, start: 1320, end: 1440, before: false, after: true },
      { day: 4, start: 0, end: 360, before: true, after: false },
    ])
  })
  it('clips Sunday and excludes outside or zero length midnight segments', () => {
    const parts = calendarSegments('2026-11-02', [shift('a', '2026-11-08T22:00:00', '2026-11-09T06:00:00'), shift('b', '2026-11-01T22:00:00', '2026-11-02T00:00:00'), shift('c', '2026-11-09T08:00:00', '2026-11-09T09:00:00')])
    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({ day: 6, start: 1320, end: 1440, after: true })
  })
  it('separates overlapping shifts and reuses lanes for adjacent shifts', () => {
    const parts = calendarSegments('2026-11-02', [shift('a', '2026-11-02T08:00:00', '2026-11-02T10:00:00'), shift('b', '2026-11-02T09:00:00', '2026-11-02T11:00:00'), shift('c', '2026-11-02T11:00:00', '2026-11-02T12:00:00')])
    expect(parts.map(({ lane, columns }) => [lane, columns])).toEqual([[0, 2], [1, 2], [0, 1]])
  })
})
