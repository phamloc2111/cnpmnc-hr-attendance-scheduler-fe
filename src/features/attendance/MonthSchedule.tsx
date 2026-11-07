import { useEffect, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { addDays, dateLabel, instantLabel } from '../../shared/utils/dates'
import type { WorkSchedule } from '../schedule'
import { loadScheduleRange, shiftSummary } from './home'
import { HomeIcon } from './HomeIcon'

export function monthRange(month: string) {
  const first = month + '-01'
  const next = new Date(first + 'T00:00:00Z')
  next.setUTCMonth(next.getUTCMonth() + 1)
  return { first, last: addDays(next.toISOString().slice(0, 10), -1) }
}
export function moveMonth(month: string, amount: number) {
  const date = new Date(month + '-01T00:00:00Z')
  date.setUTCMonth(date.getUTCMonth() + amount)
  return date.toISOString().slice(0, 7)
}
const weekday = (day: string) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(day + 'T00:00:00Z').getUTCDay()]
export function MonthSchedule({ today, clock, revision }: { today: string; clock: number; revision: number }) {
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [data, setData] = useState<WorkSchedule[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, retry] = useState(0)
  const [day, setDay] = useState<string | null>(null)
  const [followingToday, followToday] = useState(true)
  const activeMonth = followingToday ? today.slice(0, 7) : month
  const { first, last } = monthRange(activeMonth)
  useEffect(() => {
    let active = true
    setData(null); setError(''); setDay(null)
    loadScheduleRange(first, last).then(items => { if (active) setData(items) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được lịch tháng.') })
    return () => { active = false }
  }, [first, last, revision, attempt])
  const days = Array.from({ length: new Date(last + 'T00:00:00Z').getUTCDate() }, (_, index) => addDays(first, index))
  const monthShifts = (data ?? []).filter(shift => shift.workDate >= first && shift.workDate <= last)
  const byDay = new Map<string, WorkSchedule[]>()
  monthShifts.forEach(shift => byDay.set(shift.workDate, [...(byDay.get(shift.workDate) ?? []), shift]))
  byDay.forEach(items => items.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)))
  const minutes = monthShifts.reduce((sum, shift) => sum + shift.workingMinutes, 0)
  const ended = monthShifts.filter(shift => Date.parse(shift.endsAt) <= clock).length
  const percentage = monthShifts.length ? Math.round(ended * 100 / monthShifts.length) : 0
  const title = 'Tháng ' + Number(activeMonth.slice(5)) + ', ' + activeMonth.slice(0, 4)
  function changeMonth(amount: number) { setMonth(moveMonth(activeMonth, amount)); followToday(false) }
  return <>
    <section className="home-stats" aria-label="Tổng quan lịch tháng"><div><span>Giờ được phân tháng này</span><strong>{data && !error ? <>{Math.floor(minutes / 60)}<small>h</small> {minutes % 60}<small>m</small></> : '—'}</strong></div>
      <div><div className="home-progress-meta"><span>Ca đã kết thúc</span><strong>{data && !error ? percentage + '%' : '—'}</strong></div>
        <div className="home-progress-track"><span style={{ width: percentage + '%' }} /></div>
        <small>{data && !error ? ended + '/' + monthShifts.length + ' ca đã phân trong tháng' : 'Đang chờ dữ liệu lịch'}</small></div>
    </section>
    <section className="home-month-section" id="employee-calendar" aria-label="Lịch làm việc tháng">
      <div className="home-month-heading"><div><p className="home-kicker">LỊCH LÀM VIỆC</p><h2>{title}</h2></div>
        <div className="home-month-controls"><button className="home-today-button" onClick={() => { followToday(true); setMonth(today.slice(0, 7)); retry(value => value + 1) }}>Hôm nay</button>
          <button aria-label="Tháng trước" onClick={() => changeMonth(-1)}><HomeIcon name="left" size={18} /></button>
          <button aria-label="Tháng sau" onClick={() => changeMonth(1)}><HomeIcon name="right" size={18} /></button></div></div>
      <a className="home-week-link" href="#/my-schedule">Xem lịch của tôi →</a>
      {error ? <div className="home-state"><p role="alert">{error}</p><button onClick={() => retry(value => value + 1)}>Thử lại lịch tháng</button></div>
        : !data ? <p className="home-state" role="status">Đang tải lịch tháng…</p>
        : <div className="home-month-calendar">{days.map(value => {
          const items = byDay.get(value) ?? []
          return <button key={value} className={'home-agenda-day' + (value === today ? ' today' : '') + (value === day ? ' selected' : '')}
            aria-current={value === today ? 'date' : undefined} aria-label={'Xem lịch ngày ' + dateLabel(value)} onClick={() => setDay(value)}>
            <span className="home-agenda-date"><small>{weekday(value)}</small><strong>{Number(value.slice(-2))}</strong></span>
            <span className="home-agenda-events">{items.length ? items.map(shift => <span className="home-agenda-event" key={shift.id}><i /><span>
              <strong>{instantLabel(shift.startsAt).split(' ')[1]} {shift.shiftName}</strong><small>{shift.requiredPosition || 'Chưa có vị trí'}</small></span></span>)
              : <span className="home-agenda-empty">Chưa có ca làm</span>}</span>
            <HomeIcon name="right" size={16} />
          </button>
        })}</div>}
    </section>
    {day && data && <Modal title={'Lịch ngày ' + dateLabel(day)} busy={false} onClose={() => setDay(null)}>
      {(byDay.get(day) ?? []).length === 0 ? <p>Chưa có ca làm được phân trong ngày này.</p>
        : <ul className="home-day-details">{(byDay.get(day) ?? []).map(shift => <li key={shift.id}><h3>{shift.shiftName}</h3><p>{shiftSummary(shift)}</p><small>Nghỉ {shift.breakMinutes} phút · Làm {shift.workingMinutes} phút</small></li>)}</ul>}
    </Modal>}
  </>
}
