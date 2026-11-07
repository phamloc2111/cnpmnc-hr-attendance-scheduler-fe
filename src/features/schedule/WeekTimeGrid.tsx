import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, dateLabel, instantLabel, vietnamToday } from '../../shared/utils/dates'
import type { WorkSchedule } from './types'
import { calendarSegments } from './week-calendar'

const weekdays = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN']
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`
function color(value: string) { return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % 5 }

export function WeekTimeGrid({ week, shifts, onSelect }: { week: string; shifts: WorkSchedule[]; onSelect: (shift: WorkSchedule) => void }) {
  const segments = useMemo(() => calendarSegments(week, shifts), [week, shifts])
  const viewport = useRef<HTMLDivElement>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = vietnamToday()
  const days = Array.from({ length: 7 }, (_, day) => addDays(week, day))
  const selectedIndex = days.indexOf(selectedDate || '')
  const todayIndex = days.indexOf(today)
  const focusedDay = selectedIndex >= 0 ? selectedIndex : todayIndex >= 0 ? todayIndex : segments[0]?.day ?? 0
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    const element = viewport.current
    if (element) {
      const hourHeight = parseFloat(getComputedStyle(element).getPropertyValue('--calendar-hour-height')) || 64
      const daySegments = segments.filter(segment => segment.day === focusedDay)
      const candidates = daySegments.length ? daySegments : segments
      const first = candidates.length ? Math.min(...candidates.map(segment => segment.start)) / 60 : 7
      element.scrollTop = Math.max(0, first * hourHeight - 12)
    }
  }, [week, segments, focusedDay])
  const nowText = instantLabel(new Date(now).toISOString()).split(' ')[1]
  const nowMinute = Number(nowText.split(':')[0]) * 60 + Number(nowText.split(':')[1])
  return <>
    {!segments.length && <div className="week-calendar-empty"><h2>Chưa có lịch trong tuần này</h2><p>Lịch sẽ xuất hiện khi quản lý phân ca cho bạn.</p></div>}
    <div className="week-calendar" ref={viewport} role="region" aria-label="Lưới lịch tuần theo giờ" tabIndex={0}>
      <div className="week-calendar-header"><span className="week-calendar-zone">GMT+7</span>{weekdays.map((label, day) => {
        const date = addDays(week, day)
        return <button type="button" key={date} className={'week-calendar-day' + (date === today ? ' is-today' : '')} aria-label={label + ', ' + dateLabel(date)} aria-pressed={day === focusedDay} onClick={() => setSelectedDate(date)}><span>{label}</span><strong>{Number(date.slice(-2))}</strong></button>
      })}</div>
      <div className="week-calendar-body">
        <div className="week-calendar-hours" aria-label="Giờ trong ngày">{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: `${hour / 24 * 100}%` }}>{clock(hour * 60)}</span>)}</div>
        {weekdays.map((_, day) => <div className={'week-calendar-column' + (addDays(week, day) === today ? ' is-today' : '')} key={day}>
          {segments.filter(segment => segment.day === day).map(segment => {
            const shift = segment.shift
            const overnight = instantLabel(shift.endsAt).split(' ')[0] !== dateLabel(shift.workDate)
            const label = `Chi tiết ${shift.shiftName} ngày ${dateLabel(shift.workDate)}, ${instantLabel(shift.startsAt)} → ${instantLabel(shift.endsAt)}, phần ngày ${dateLabel(addDays(week, day))}`
            return <button key={shift.id} className={'week-calendar-event event-color-' + color(shift.shiftTemplateId)}
              style={{ top: `${segment.start / 1440 * 100}%`, height: `${(segment.end - segment.start) / 1440 * 100}%`, left: `${segment.lane / segment.columns * 100}%`, width: `${100 / segment.columns}%` }}
              title={label} aria-label={label} onClick={() => onSelect(shift)}>
              {segment.before && <small>↳ Tiếp ca</small>}<strong>{shift.shiftName}</strong><span>{clock(segment.start)}–{clock(segment.end)}</span>
              {overnight && !segment.before && <small>(+1 ngày)</small>}
              {shift.requiredPosition && <span>{shift.requiredPosition}</span>}
              {segment.after && <small>Tiếp ngày sau ↴</small>}
            </button>
          })}
          {addDays(week, day) === today && <div className="week-calendar-now" style={{ top: `${nowMinute / 1440 * 100}%` }} aria-label={'Giờ hiện tại ' + nowText}><i /></div>}
        </div>)}
      </div>
    </div>
  </>
}
