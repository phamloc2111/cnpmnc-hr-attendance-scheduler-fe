import { useEffect, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { addDays, dateLabel, instantLabel, monday, vietnamToday } from '../../shared/utils/dates'
import { listSchedules } from './api'
import type { Page, WorkSchedule } from './types'
import './employee-schedule.css'

export function EmployeeSchedulePage({ name, email, onChangePassword, onLogout, loggingOut = false }: {
  name: string; email: string; onChangePassword: () => void; onLogout: () => void; loggingOut?: boolean
}) {
  const [week, setWeek] = useState(() => monday(vietnamToday()))
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<WorkSchedule> | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  const [profile, setProfile] = useState(false)
  const [detail, setDetail] = useState<WorkSchedule | null>(null)
  useEffect(() => {
    let active = true
    setData(null); setError(''); setDetail(null)
    listSchedules(week, addDays(week, 6), page).then(result => { if (active) setData(result) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không thể tải lịch làm việc.') })
    return () => { active = false }
  }, [week, page, revision])
  function changeWeek(value: string) { if (value) { setWeek(monday(value)); setPage(0) } }
  const range = dateLabel(week) + ' – ' + dateLabel(addDays(week, 6))
  const today = vietnamToday()
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
      <section className="employee-week-results" aria-label="Danh sách ca trong tuần">
        <div className="employee-week-list-heading"><h2>Ca làm trong tuần</h2>{data && !error && <span>{data.totalElements} ca đã phân</span>}</div>
        {error ? <div className="employee-week-state"><span className="employee-week-state-icon"><HomeIcon name="refresh" size={29} /></span><h2>Chưa tải được lịch</h2><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div>
          : !data ? <p className="employee-week-state" role="status">Đang tải lịch làm việc…</p>
          : !data.items.length ? <div className="employee-week-state"><span className="employee-week-state-icon"><HomeIcon name="calendar" size={32} /></span><h2>Chưa có lịch trong tuần này</h2><p>Lịch sẽ xuất hiện khi quản lý phân ca cho bạn.</p><a href="#/employee">Về trang chủ</a></div>
          : <><ul className="employee-week-list">{data.items.map(shift => {
            const day = new Date(shift.workDate + 'T00:00:00Z')
            const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'short' }).format(day)
            const start = instantLabel(shift.startsAt).split(' ')[1]
            const end = instantLabel(shift.endsAt).split(' ')[1]
            const overnight = instantLabel(shift.endsAt).split(' ')[0] !== dateLabel(shift.workDate)
            return <li key={shift.id} className={'employee-week-shift' + (shift.workDate === today ? ' today' : '')}>
              <div className="employee-week-date"><span>{weekday}</span><strong>{day.getUTCDate()}</strong><small>Tháng {day.getUTCMonth() + 1}</small></div>
              <div className="employee-week-shift-info"><div className="employee-week-shift-title"><h3>{shift.shiftName}</h3>{shift.workDate === today && <span>Hôm nay</span>}</div>
                <p className="employee-week-shift-time"><HomeIcon name="clock" size={16} />{start} → {end}{overnight && <span className="employee-overnight">(+1 ngày)</span>}</p>
                <p className="employee-week-position"><HomeIcon name="pin" size={14} />{shift.requiredPosition || 'Chưa có vị trí'}</p>
                <small>Nghỉ {shift.breakMinutes} phút · Làm {shift.workingMinutes} phút</small></div>
              <button className="employee-week-detail" aria-label={'Chi tiết ' + shift.shiftName + ' ngày ' + dateLabel(shift.workDate)} onClick={() => setDetail(shift)}><HomeIcon name="right" size={18} /></button>
            </li>
          })}</ul>
          <div className="employee-week-pagination"><button disabled={data.page === 0} onClick={() => setPage(value => value - 1)}>Trang trước</button>
            <span>Trang {data.page + 1} / {Math.max(1, data.totalPages)}</span><button disabled={data.page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></div></>}
      </section>
      <p className="employee-week-note">Ngày làm việc là ngày bắt đầu ca. Ca qua đêm có ký hiệu (+1 ngày).</p>
    </div>
    <nav className="home-bottom-nav employee-week-nav" aria-label="Điều hướng nhân viên"><a href="#/employee"><span><HomeIcon name="clock" size={21} /></span>Trang chủ</a>
      <a className="active" href="#/my-schedule" aria-current="page"><span><HomeIcon name="calendar" size={21} /></span>Lịch của tôi</a>
      <button onClick={() => setProfile(true)}><span><HomeIcon name="user" size={21} /></span>Cá nhân</button></nav>
    {detail && <Modal title="Chi tiết ca làm" busy={false} onClose={() => setDetail(null)}><h3>{detail.shiftName}</h3><p>{dateLabel(detail.workDate)}</p><p>{instantLabel(detail.startsAt)} → {instantLabel(detail.endsAt)}</p><p>{detail.requiredPosition || 'Chưa có vị trí'}</p><p>Nghỉ {detail.breakMinutes} phút · Làm {detail.workingMinutes} phút</p></Modal>}
    {profile && <Modal title="Tài khoản của tôi" busy={false} onClose={() => setProfile(false)}><h3>{name}</h3><p>{email}</p><p>Nhân viên</p><div className="modal-actions"><button onClick={() => { setProfile(false); onChangePassword() }}>Đổi mật khẩu</button><button disabled={loggingOut} onClick={onLogout}>Đăng xuất</button></div></Modal>}
  </main>
}
