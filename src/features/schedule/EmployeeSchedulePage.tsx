import { useEffect, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { addDays, dateLabel, instantLabel, monday, vietnamToday } from '../../shared/utils/dates'
import { loadEmployeeWeek, calendarSegments } from './week-calendar'
import { WeekTimeGrid } from './WeekTimeGrid'
import type { WorkSchedule } from './types'
import { loadOwnPriority } from '../priority/api'
import type { Own } from '../priority/api'
import './employee-schedule.css'

export function EmployeeSchedulePage({ name, email, onChangePassword, onLogout, loggingOut = false }: {
  name: string; email: string; onChangePassword: () => void; onLogout: () => void; loggingOut?: boolean
}) {
  const [week, setWeek] = useState(() => monday(vietnamToday()))
  const [data, setData] = useState<WorkSchedule[] | null>(null)
  const [priority, setPriority] = useState<Own | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  const [profile, setProfile] = useState(false)
  const [detail, setDetail] = useState<WorkSchedule | null>(null)

  useEffect(() => {
    let active = true
    setData(null); setError(''); setDetail(null)
    loadEmployeeWeek(week).then(result => { if (active) setData(result) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không thể tải lịch làm việc.') })
    
    // Tải điểm ưu tiên tuần của nhân viên (US28)
    loadOwnPriority(week).then(p => { if (active) setPriority(p) }).catch(() => { if (active) setPriority(null) })

    return () => { active = false }
  }, [week, revision])

  function changeWeek(value: string) { if (value) { setWeek(monday(value)) } }
  const range = dateLabel(week) + ' – ' + dateLabel(addDays(week, 6))
  const count = data ? new Set(calendarSegments(week, data).map(segment => segment.shift.id)).size : 0

  return <main className="workspace employee-home employee-week-page">
    <header className="home-hero employee-week-hero">
      <div className="home-hero-top"><a className="home-brand" href="#/employee" aria-label="Về trang chủ ShiftSync"><span>S</span><strong>ShiftSync</strong></a>
        <div className="home-hero-actions"><button aria-label="Đổi mật khẩu" onClick={onChangePassword}><HomeIcon name="key" size={19} /></button>
          <button aria-label="Đăng xuất" disabled={loggingOut} onClick={onLogout}><HomeIcon name="logout" size={19} /></button></div></div>
      <div className="employee-week-title"><a href="#/employee"><HomeIcon name="left" size={16} />Trang chủ</a><p>LỊCH LÀM VIỆC</p><h1>Lịch của tôi</h1><span>Theo tuần · Giờ Việt Nam (UTC+7)</span></div>
    </header>
    <div className="employee-week-content">
      <section className="employee-week-selector" aria-label="Chọn tuần làm việc">
        <div className="employee-week-controls"><button aria-label="Tuần trước" onClick={() => changeWeek(addDays(week, -7))}><HomeIcon name="left" /></button>
          <div className="employee-week-picker"><label htmlFor="employee-schedule-week">Chọn tuần</label><input id="employee-schedule-week" type="date" value={week} onChange={event => changeWeek(event.target.value)} /></div>
          <button aria-label="Tuần sau" onClick={() => changeWeek(addDays(week, 7))}><HomeIcon name="right" /></button></div>
        <div className="employee-week-toolbar"><button className="employee-this-week" onClick={() => changeWeek(vietnamToday())}>Tuần này</button>
          <button className="employee-reload-week" onClick={() => refresh(value => value + 1)}><HomeIcon name="refresh" size={15} />Tải lại</button></div>
        <div className="employee-week-range"><HomeIcon name="calendar" size={16} /><strong>{range}</strong></div>
      </section>

      {priority && (
        <section className="priority-own-card" style={{ margin: '0 0 16px 0' }}>
          <span>Điểm ưu tiên tuần này ({dateLabel(priority.weekStart)})</span>
          <strong>{priority.score}<small>/100</small></strong>
          <p>Điểm dùng khi quản lý xếp ca, cập nhật tự động theo chuyên cần và lịch sử làm việc.</p>
        </section>
      )}

      <section className="employee-week-results" aria-label="Danh sách ca trong tuần">
        <div className="employee-week-list-heading"><h2>Ca làm trong tuần</h2>{data && !error && <span>{count} ca đã phân</span>}</div>
        {error ? <div className="employee-week-state"><span className="employee-week-state-icon"><HomeIcon name="refresh" size={29} /></span><h2>Chưa tải được lịch</h2><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div>
          : !data ? <p className="employee-week-state" role="status">Đang tải lịch làm việc…</p>
          : <WeekTimeGrid week={week} shifts={data} onSelect={setDetail} />}
      </section>
      <p className="employee-week-note">Bấm vào ca để xem chi tiết. Lịch chỉ hiển thị khi đã được quản lý công bố.</p>
    </div>
    <nav className="home-bottom-nav registration-four-nav employee-week-nav" aria-label="Điều hướng nhân viên"><a href="#/employee"><span><HomeIcon name="clock" size={21} /></span>Trang chủ</a>
      <a className="active" href="#/my-schedule" aria-current="page"><span><HomeIcon name="calendar" size={21} /></span>Lịch của tôi</a>
      <a href="#/registrations"><span><HomeIcon name="check" size={21} /></span>Đăng ký ca</a>
      <button onClick={() => setProfile(true)}><span><HomeIcon name="user" size={21} /></span>Cá nhân</button></nav>
    {detail && <Modal title="Chi tiết ca làm" busy={false} onClose={() => setDetail(null)}><h3>{detail.shiftName}</h3><p>{dateLabel(detail.workDate)}</p><p>{instantLabel(detail.startsAt)} → {instantLabel(detail.endsAt)}</p><p>{detail.requiredPosition || 'Chưa có vị trí'}</p><p>Nghỉ {detail.breakMinutes} phút · Làm {detail.workingMinutes} phút</p></Modal>}
    {profile && <Modal title="Tài khoản của tôi" busy={false} onClose={() => setProfile(false)}><h3>{name}</h3><p>{email}</p><p>Nhân viên</p><div className="modal-actions"><button onClick={() => { setProfile(false); onChangePassword() }}>Đổi mật khẩu</button><button disabled={loggingOut} onClick={onLogout}>Đăng xuất</button></div></Modal>}
  </main>
}
