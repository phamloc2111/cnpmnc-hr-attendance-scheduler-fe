import { useEffect, useState } from 'react'
import { vietnamToday } from '../../shared/utils/dates'
import type { WorkSchedule } from '../schedule'
import { InstallApp } from './InstallApp'
import { loadHomeSchedules, shiftSummary, visibleSchedules } from './home'
import './home.css'

export function EmployeeHome({ name }: { name: string }) {
  const [clock, setClock] = useState(() => Date.now())
  const [today, setToday] = useState(vietnamToday)
  const [data, setData] = useState<WorkSchedule[] | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  const [selectedId, select] = useState('')
  useEffect(() => {
    const tick = () => { setClock(Date.now()); setToday(vietnamToday()) }
    const resume = () => { if (document.visibilityState === 'visible') { tick(); refresh(value => value + 1) } }
    const timer = window.setInterval(tick, 30000)
    window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume)
    return () => { clearInterval(timer); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume) }
  }, [])
  useEffect(() => {
    let active = true
    setData(null); setError('')
    loadHomeSchedules(today).then(items => { if (active) setData(items) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được ca hôm nay.') })
    return () => { active = false }
  }, [today, revision])
  const shifts = visibleSchedules(data ?? [], today, clock)
  const available = shifts.filter(item => Date.parse(item.endsAt) > clock)
  const selected = available.find(item => item.id === selectedId) ?? available[0]
  return <main className="workspace employee-home">
    <p className="eyebrow">MỘT NGÀY LÀM VIỆC MỚI</p>
    <h1>Xin chào, {name}.</h1><p className="muted">Ca làm và điểm danh của bạn, ngay tại đây.</p>
    <div className="home-heading"><h2>Ca làm hôm nay</h2><button onClick={() => refresh(value => value + 1)}>Tải lại ca</button></div>
    <p className="muted">Giờ Việt Nam (UTC+7)</p>
    {error ? <section className="home-state"><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></section>
      : !data ? <p className="home-state" role="status">Đang tải ca hôm nay…</p>
      : shifts.length === 0 ? <section className="home-state"><h2>Hôm nay bạn chưa có ca</h2><p>Kiểm tra lịch tuần hoặc liên hệ quản lý nếu cần phân ca.</p></section>
      : <ul className="today-shifts">{shifts.map(shift => {
        const ended = Date.parse(shift.endsAt) <= clock
        const active = !ended && Date.parse(shift.startsAt) <= clock
        return <li key={shift.id} className={'today-shift' + (selected?.id === shift.id ? ' selected' : '')}>
          <span className="shift-state">{ended ? 'Đã kết thúc' : active ? (shift.workDate !== today ? 'Ca đêm đang tiếp tục' : 'Đang trong ca') : 'Sắp bắt đầu'}</span>
          <h3>{shift.shiftName}</h3><p>{shiftSummary(shift)}</p><small>Nghỉ {shift.breakMinutes} phút · Làm {shift.workingMinutes} phút</small>
          {!ended && <label className="shift-choice"><input type="radio" name="today-shift" value={shift.id} checked={selected?.id === shift.id} onChange={() => select(shift.id)} />Chọn {shift.shiftName} để điểm danh</label>}
        </li>
      })}</ul>}
    <a className="home-week-link" href="#/my-schedule">Xem lịch của tôi →</a>
    <InstallApp />
    <div className="attendance-dock"><div><small>{selected ? selected.shiftName : error ? 'Tải lại ca để tiếp tục' : !data ? 'Đang tải ca làm' : 'Chưa có ca có thể điểm danh'}</small>
      <button className="primary" disabled={!selected || !data || !!error}
        onClick={() => { if (selected) window.location.hash = '/attendance?date=' + selected.workDate + '&schedule=' + selected.id }}>Điểm danh</button></div></div>
  </main>
}
