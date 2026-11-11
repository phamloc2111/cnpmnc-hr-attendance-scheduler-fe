import { useEffect, useState } from 'react'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { dateLabel, vietnamToday } from '../../shared/utils/dates'
import { loadOwnMonth, loadOwnWeek } from './api'
import type { OwnPeriod } from './api'
import './employee-diligence.css'

const labels: Record<string, string> = {
  LATE: 'Đi trễ', LATE_EXCUSED: 'Đi trễ đã miễn phạt', EARLY_LEAVE: 'Về sớm',
  HALF_DAY_ABSENCE: 'Về sớm quá nửa ca', ABSENCE_FIRST: 'Nghỉ không phép',
  ABSENCE_REPEATED: 'Nghỉ không phép tiếp theo', DISCIPLINARY_REFERRAL: 'Chuyển xử lý kỷ luật',
  LATE_APPROVED_LEAVE: 'Nghỉ báo muộn được duyệt', MISSING_REPEATED: 'Quên chấm từ lần thứ ba',
  MISSING_LATE_EXPLANATION: 'Quên chấm giải trình muộn', MISSING_EXPIRED: 'Quên chấm quá hạn',
}

export function minutesLabel(minutes: number) {
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`
}

function PeriodCard({ title, period, loading, error, retry }: { title: string; period: OwnPeriod | null; loading: boolean; error: string; retry: () => void }) {
  return <section className="my-diligence-card" aria-label={title}>
    <span>{title}</span>
    {loading ? <p role="status">Đang tải số liệu…</p> : error ? <><p role="alert">{error}</p><button onClick={retry}>Thử lại</button></> : period ? <>
      <strong>{minutesLabel(period.workedMinutes)}</strong><p>Điểm chuyên cần <b>{period.score}/100</b> · Trừ {period.deductedPoints} điểm</p>
    </> : null}
  </section>
}

export function EmployeeDiligencePage() {
  const today = vietnamToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [date, setDate] = useState(today)
  const [view, setView] = useState<'MONTH' | 'WEEK'>('MONTH')
  const [monthly, setMonthly] = useState<OwnPeriod | null>(null)
  const [weekly, setWeekly] = useState<OwnPeriod | null>(null)
  const [monthError, setMonthError] = useState('')
  const [weekError, setWeekError] = useState('')
  const [revision, refresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); setMonthly(null); setMonthError('')
    loadOwnMonth(month, controller.signal).then(setMonthly).catch((error: unknown) => { if (!controller.signal.aborted) setMonthError(error instanceof Error ? error.message : 'Không tải được dữ liệu tháng.') })
    return () => controller.abort()
  }, [month, revision])
  useEffect(() => {
    const controller = new AbortController(); setWeekly(null); setWeekError('')
    loadOwnWeek(date, controller.signal).then(setWeekly).catch((error: unknown) => { if (!controller.signal.aborted) setWeekError(error instanceof Error ? error.message : 'Không tải được dữ liệu tuần.') })
    return () => controller.abort()
  }, [date, revision])
  const period = view === 'MONTH' ? monthly : weekly
  const error = view === 'MONTH' ? monthError : weekError
  const deductions = period?.days.filter(day => day.deductedPoints > 0) ?? []
  return <main className="workspace employee-home employee-diligence-page">
    <header className="home-hero"><div className="home-hero-top"><a className="home-brand" href="#/employee"><span>S</span><strong>ShiftSync</strong></a><a className="my-diligence-back" href="#/employee"><HomeIcon name="left" size={16} />Trang chủ</a></div>
      <div className="my-diligence-title"><p>CHUYÊN CẦN</p><h1>Giờ làm và điểm của tôi</h1><span>Dữ liệu chấm công đã ghi nhận · Giờ Việt Nam (UTC+7)</span></div></header>
    <div className="home-content my-diligence-content">
      <section className="my-diligence-filters" aria-label="Chọn kỳ xem chuyên cần"><label>Tháng <input type="month" value={month} max={today.slice(0, 7)} min="1900-01" onChange={event => setMonth(event.target.value)} /></label>
        <label>Ngày thuộc tuần <input type="date" value={date} max={today} min="1900-01-01" onChange={event => setDate(event.target.value)} /></label>
        <button onClick={() => refresh(value => value + 1)}><HomeIcon name="refresh" size={16} />Tải lại</button></section>
      <div className="my-diligence-grid"><PeriodCard title="Tháng đã chọn" period={monthly} loading={!monthly && !monthError} error={monthError} retry={() => refresh(value => value + 1)} />
        <PeriodCard title="Tuần đã chọn" period={weekly} loading={!weekly && !weekError} error={weekError} retry={() => refresh(value => value + 1)} /></div>
      <section className="my-diligence-history" aria-label="Lịch sử trừ điểm"><div className="my-diligence-history-head"><div><p className="home-kicker">CHI TIẾT CHUYÊN CẦN</p><h2>Lịch sử trừ điểm</h2></div><div role="group" aria-label="Kỳ lịch sử"><button className={view === 'MONTH' ? 'active' : ''} aria-pressed={view === 'MONTH'} onClick={() => setView('MONTH')}>Theo tháng</button><button className={view === 'WEEK' ? 'active' : ''} aria-pressed={view === 'WEEK'} onClick={() => setView('WEEK')}>Theo tuần</button></div></div>
        {error ? <p role="alert">{error}</p> : !period ? <p role="status">Đang tải lịch sử…</p> : <><p className="my-diligence-range">{dateLabel(period.from)} – {dateLabel(period.to)} · {period.finalized ? 'Đã kết thúc' : 'Đang cập nhật'}</p>
          {!deductions.length ? <p className="my-diligence-empty">Chưa có lần trừ điểm trong kỳ này.</p> : <ul>{deductions.map(day => <li key={day.workDate}><div><strong>{dateLabel(day.workDate)}</strong><span>{day.components.filter(part => part.points > 0).map((part, index) => <small key={index}>{labels[part.code] || part.code}: −{part.points} điểm</small>)}</span>{day.capped && <small>Đã áp dụng trần 20 điểm/ngày (trước trần {day.rawPoints} điểm).</small>}{day.disciplinaryReferral && <small>Chuyển xử lý kỷ luật theo nội quy.</small>}</div><b>−{day.deductedPoints}</b></li>)}</ul>}
          <p className="my-diligence-footnote">Giờ làm tính từ lượt vào và ra ca đã ghi nhận, trừ thời gian nghỉ; ca thiếu một lượt chấm chưa có giờ hoàn tất. Điểm có thể thay đổi khi quản lý duyệt giải trình.</p></>}
      </section>
    </div>
    <nav className="home-bottom-nav registration-nav" aria-label="Điều hướng nhân viên"><a href="#/employee"><span><HomeIcon name="dashboard" size={21} /></span>Trang chủ</a><a href="#/my-schedule"><span><HomeIcon name="calendar" size={21} /></span>Lịch của tôi</a><a href="#/registrations"><span><HomeIcon name="check" size={21} /></span>Đăng ký ca</a><a className="active" aria-current="page" href="#/my-diligence"><span><HomeIcon name="clock" size={21} /></span>Chuyên cần</a></nav>
  </main>
}
