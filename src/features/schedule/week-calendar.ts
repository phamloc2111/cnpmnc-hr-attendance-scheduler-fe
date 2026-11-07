import { addDays } from '../../shared/utils/dates'
import { listSchedules } from './api'
import type { WorkSchedule } from './types'

export async function loadEmployeeWeek(week: string) {
  const shifts = new Map<string, WorkSchedule>()
  let page = 0
  let totalPages = 1
  do {
    const result = await listSchedules(addDays(week, -1), addDays(week, 6), page)
    result.items.forEach(shift => shifts.set(shift.id, shift))
    totalPages = result.totalPages
    page++
  } while (page < totalPages)
  return [...shifts.values()]
}

export type CalendarSegment = {
  shift: WorkSchedule; day: number; start: number; end: number
  before: boolean; after: boolean; lane: number; columns: number
}

// All geometry uses Vietnam civil days, independently of the browser timezone.
export function calendarSegments(week: string, shifts: WorkSchedule[]): CalendarSegment[] {
  const result: CalendarSegment[] = []
  for (let day = 0; day < 7; day++) {
    const midnight = Date.parse(addDays(week, day) + 'T00:00:00+07:00')
    const segments = shifts.flatMap(shift => {
      const from = Date.parse(shift.startsAt), to = Date.parse(shift.endsAt)
      const start = Math.max(midnight, from), end = Math.min(midnight + 86400000, to)
      return end > start ? [{ shift, day, start: (start - midnight) / 60000, end: (end - midnight) / 60000,
        before: from < midnight, after: to > midnight + 86400000, lane: 0, columns: 1 }] : []
    }).sort((a, b) => a.start - b.start || a.end - b.end || a.shift.id.localeCompare(b.shift.id))
    let group: CalendarSegment[] = [], laneEnds: number[] = [], groupEnd = -1
    function finishGroup() { group.forEach(segment => { segment.columns = laneEnds.length }) }
    for (const segment of segments) {
      if (segment.start >= groupEnd) { finishGroup(); group = []; laneEnds = []; groupEnd = -1 }
      const free = laneEnds.findIndex(end => end <= segment.start)
      segment.lane = free < 0 ? laneEnds.length : free
      laneEnds[segment.lane] = segment.end
      group.push(segment); groupEnd = Math.max(groupEnd, segment.end)
    }
    finishGroup(); result.push(...segments)
  }
  return result
}
