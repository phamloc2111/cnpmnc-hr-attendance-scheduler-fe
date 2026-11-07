import { listSchedules } from '../schedule'
import type { WorkSchedule } from '../schedule'
import { addDays, dateLabel, instantLabel } from '../../shared/utils/dates'

export async function loadHomeSchedules(today: string) {
  const items: WorkSchedule[] = []
  let page = 0
  let pages = 1
  do {
    const result = await listSchedules(addDays(today, -1), today, page)
    items.push(...result.items)
    pages = result.totalPages
    page++
  } while (page < pages)
  return items
}
export function visibleSchedules(items: WorkSchedule[], today: string, now: number) {
  return items.filter(item => item.workDate === today || (Date.parse(item.startsAt) <= now && Date.parse(item.endsAt) > now))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}
export function shiftSummary(shift: WorkSchedule) {
  const day = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(shift.workDate + 'T00:00:00Z'))
  const weekday = day.charAt(0).toUpperCase() + day.slice(1)
  const endDate = instantLabel(shift.endsAt).split(' ')[0]
  const overnight = endDate !== dateLabel(shift.workDate) ? ' (+1 ngày)' : ''
  return weekday + ', ' + dateLabel(shift.workDate) + ' · ' + instantLabel(shift.startsAt).split(' ')[1] + '–'
    + instantLabel(shift.endsAt).split(' ')[1] + overnight + ' · ' + (shift.requiredPosition || 'Chưa có vị trí')
}
