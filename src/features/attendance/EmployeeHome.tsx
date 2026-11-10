import { useEffect, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { addDays, vietnamToday } from '../../shared/utils/dates'
import type { WorkSchedule } from '../schedule'
import { CaptureAttendanceModal } from './CaptureAttendanceModal'
import { listMyAttendance } from './api'
import type { AttendanceEvent } from './types'
import { InstallApp } from './InstallApp'
import { loadHomeSchedules, shiftSummary, visibleSchedules } from './home'
import { instantLabel } from '../../shared/utils/dates'
import { HomeIcon } from './HomeIcon'
import { PushSettings } from '../notification'
import { MonthSchedule } from './MonthSchedule'
import './manrope.css'
import './home.css'

export function EmployeeHome({ name, email, employeeId, onChangePassword, onLogout, loggingOut = false }: {
  name: string; email?: string; employeeId?: string; onChangePassword?: () => void; onLogout?: () => void; loggingOut?: boolean
}) {
  const [clock, setClock] = useState(() => Date.now())
  const [today, setToday] = useState(vietnamToday)
  const [data, setData] = useState<WorkSchedule[] | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  const [selectedId, select] = useState('')
  const [attendance, setAttendance] = useState<WorkSchedule | null>(null)
  const [events, setEvents] = useState<AttendanceEvent[] | null>(null)
  const [eventsError, setEventsError] = useState('')
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState(false)
  const [notifications, setNotifications] = useState(false)
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
  useEffect(() => {
    let active = true; setEventsError(''); setEvents(null)
    listMyAttendance(addDays(today, -1), today).then(result => { if (active) setEvents(result) })
      .catch((failure: unknown) => { if (active) setEventsError(failure instanceof Error ? failure.message : 'Không tải được trạng thái điểm danh.') })
    return () => { active = false }
  }, [today, revision])
  const checkedIn = (id: string) => events?.some(event => event.scheduleId === id && event.type === 'CHECK_IN') ?? false
  const checkedOut = (id: string) => events?.some(event => event.scheduleId === id && event.type === 'CHECK_OUT') ?? false
  const pendingOut = (id: string) => checkedIn(id) && !checkedOut(id)
  const shifts = visibleSchedules((data ?? []).filter(item => !pendingOut(item.id)), today, clock)
    .concat((data ?? []).filter(item => pendingOut(item.id)))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const available = shifts.filter(item => !checkedOut(item.id) && (Date.parse(item.endsAt) > clock || pendingOut(item.id)))
  const selected = available.find(item => item.id === selectedId) ?? available[0]
  const canAttend = !!selected && !!data && !!events && !error && !eventsError
  const attendanceType = selected && checkedIn(selected.id) ? 'CHECK_OUT' : 'CHECK_IN'
  const localClock = instantLabel(new Date(clock).toISOString()).split(' ')[1]
  const hour = Number(localClock.split(':')[0])
  const greeting = hour < 12 ? 'Chào buổi sáng,' : hour < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,'
  const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(clock))
  const initials = name.trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join('').toLocaleUpperCase('vi')
  return <main className="workspace employee-home">
    <header className="home-hero">
      <div className="home-hero-top"><a className="home-brand" href="#/employee" aria-label="Trang chủ ShiftSync"><span>S</span><strong>ShiftSync</strong></a>
        <div className="home-hero-actions">
          <button aria-label="Tải lại ca" onClick={() => refresh(value => value + 1)}><HomeIcon name="refresh" size={19} /></button>
          {onChangePassword && <button aria-label="Đổi mật khẩu" onClick={onChangePassword}><HomeIcon name="key" size={19} /></button>}
          {onLogout && <button aria-label="Đăng xuất" disabled={loggingOut} onClick={onLogout}><HomeIcon name="logout" size={19} /></button>}
          <button aria-label="Thông báo" aria-expanded={notifications} onClick={() => setNotifications(value => !value)}><HomeIcon name="bell" size={20} /></button>
        </div>
      </div>
      {notifications && <aside className="home-notification"><PushSettings employeeId={employeeId ?? ''} /></aside>}
      <div className="home-greeting"><span className="home-avatar">{initials}</span><div><p>{greeting}</p><h1>Xin chào, {name}.</h1></div></div>
      <div className="home-work-summary"><div><h2>CA LÀM HÔM NAY</h2>
        <strong>{selected ? instantLabel(selected.startsAt).split(' ')[1] + ' — ' + instantLabel(selected.endsAt).split(' ')[1] : error ? 'Chưa tải được ca làm' : !data ? 'Đang tải ca làm…' : 'Hôm nay chưa có ca'}</strong>
        <span><HomeIcon name="pin" size={15} />{selected?.requiredPosition || 'Vị trí theo ca được phân'}</span></div>
        <span className="home-summary-badge">{selected ? Date.parse(selected.startsAt) <= clock ? 'Đang trong ca' : 'Sắp bắt đầu' : 'Lịch của bạn'}</span>
      </div>
    </header>
    <div className="home-content">
    <section className="home-clock-card" aria-label="Giờ hiện tại"><div><time>{localClock}</time><p>{date.charAt(0).toUpperCase() + date.slice(1)}</p><small>Giờ Việt Nam (UTC+7)</small></div>
      <span className="home-attendance-status"><i />{eventsError ? 'Chưa tải được điểm danh' : !events ? 'Đang tải điểm danh…' : selected && checkedIn(selected.id) ? 'Đã vào ca · Chờ ra ca' : events.length ? 'Đã có lượt điểm danh' : 'Chưa điểm danh'}</span></section>
    {notice && <p className="notice" role="status">{notice}</p>}
    {eventsError && <div className="home-state"><p role="alert">{eventsError}</p><button onClick={() => refresh(value => value + 1)}>Tải lại điểm danh</button></div>}
    <section className="home-shifts-section" aria-label="Ca làm hôm nay">
    {error ? <section className="home-state"><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></section>
      : !data ? <p className="home-state" role="status">Đang tải ca hôm nay…</p>
      : shifts.length === 0 ? <section className="home-state"><h2>Hôm nay bạn chưa có ca</h2><p>Kiểm tra lịch tuần hoặc liên hệ quản lý nếu cần phân ca.</p></section>
      : <ul className="today-shifts">{shifts.map(shift => {
        const ended = Date.parse(shift.endsAt) <= clock
        const active = !ended && Date.parse(shift.startsAt) <= clock
        return <li key={shift.id} className={'today-shift' + (selected?.id === shift.id ? ' selected' : '')}>
          <span className="shift-state">{checkedOut(shift.id) ? 'Đã hoàn tất điểm danh' : pendingOut(shift.id) ? 'Đã vào · Chờ ra ca' : ended ? 'Đã kết thúc' : active ? (shift.workDate !== today ? 'Ca đêm đang tiếp tục' : 'Đang trong ca') : 'Sắp bắt đầu'}</span>
          <div className="home-shift-body"><div className="home-shift-time"><strong>{instantLabel(shift.startsAt).split(' ')[1]}</strong><span>{instantLabel(shift.endsAt).split(' ')[1]}</span></div>
            <div className="home-shift-info"><h3>{shift.shiftName}</h3><p className="home-shift-position"><HomeIcon name="pin" size={14} />{shift.requiredPosition || 'Chưa có vị trí'}</p><p className="home-shift-description">{shiftSummary(shift)}</p><small>Nghỉ {shift.breakMinutes} phút · Làm {shift.workingMinutes} phút</small></div>
          </div>
          {!checkedOut(shift.id) && (!ended || pendingOut(shift.id)) && <label className="shift-choice"><input type="radio" name="today-shift" value={shift.id} checked={selected?.id === shift.id} onChange={() => select(shift.id)} />Chọn {shift.shiftName} để điểm danh</label>}
        </li>
      })}</ul>}
    </section>
    <p className="home-explanation-link"><a href="#/my-explanations">Giải trình chấm công và xem kết quả duyệt →</a></p>
    <MonthSchedule today={today} clock={clock} revision={revision} />
    <div className="home-install-region"><InstallApp /></div>
    </div>
    <div className="attendance-dock"><button aria-label="Điểm danh" disabled={!canAttend} onClick={() => selected && setAttendance(selected)}>
      <span className="home-check-icon"><HomeIcon name="clock" size={25} /></span><span className="home-check-copy"><strong>{attendanceType === 'CHECK_OUT' ? 'Chấm công ra ca' : 'Chấm công vào ca'}</strong><small>{selected ? selected.shiftName + ' · Bắt đầu ' + instantLabel(selected.startsAt).split(' ')[1] : error ? 'Tải lại ca để tiếp tục' : !data ? 'Đang tải ca làm' : 'Chưa có ca có thể điểm danh'}</small></span>
      <span className="home-check-action">{attendanceType === 'CHECK_OUT' ? 'Ra ca' : 'Vào ca'}<HomeIcon name="right" size={17} /></span>
    </button></div>
    <nav className="home-bottom-nav registration-four-nav" aria-label="Điều hướng nhân viên">
      <button className="active" onClick={() => document.getElementById('employee-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span><HomeIcon name="calendar" size={21} /></span>Lịch làm</button>
      <button className="home-nav-attendance" aria-label="Chuẩn bị điểm danh" disabled={!canAttend} onClick={() => selected && setAttendance(selected)}><span><HomeIcon name="clock" size={21} /></span>Chấm công</button>
      <a href="#/registrations"><span><HomeIcon name="check" size={21} /></span>Đăng ký ca</a>
      <button onClick={() => setProfile(true)}><span><HomeIcon name="user" size={21} /></span>Cá nhân</button>
    </nav>
    {profile && <Modal title="Tài khoản của tôi" busy={false} onClose={() => setProfile(false)}><h3>{name}</h3>{email && <p>{email}</p>}<p>Nhân viên</p>
      <div className="modal-actions">{onChangePassword && <button onClick={() => { setProfile(false); onChangePassword() }}>Đổi mật khẩu</button>}
        {onLogout && <button disabled={loggingOut} onClick={onLogout}>Đăng xuất</button>}</div>
    </Modal>}
    {attendance && <CaptureAttendanceModal shift={attendance} type={checkedIn(attendance.id) ? 'CHECK_OUT' : 'CHECK_IN'} onClose={() => setAttendance(null)}
      onSaved={event => { setEvents(previous => [...(previous ?? []).filter(item => item.id !== event.id), event]); setAttendance(null); setNotice((event.type === 'CHECK_IN' ? 'Đã ghi nhận vào ca lúc ' : 'Đã ghi nhận ra ca lúc ') + instantLabel(event.receivedAt)) }} />}
  </main>
}
