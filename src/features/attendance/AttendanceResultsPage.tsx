import { useEffect, useState } from 'react'
import { addDays, dateLabel, instantLabel, monday, vietnamToday } from '../../shared/utils/dates'
import { listResults } from './api'
import type { AttendanceResult, ResultPage } from './api'
import './attendance.css'

const arrivalLabels: Record<AttendanceResult['arrival'], string> = {
  PENDING: 'Chưa vào', ON_TIME: 'Đúng giờ', LATE: 'Trễ', ABSENT: 'Vắng',
}
const departureLabels: Record<AttendanceResult['departure'], string> = {
  PENDING: 'Chưa ra', ON_TIME: 'Đúng giờ', EARLY_LEAVE: 'Về sớm', MISSING_CHECK_OUT: 'Thiếu lượt ra',
}
const overallLabels: Record<AttendanceResult['overall'], string> = {
  PENDING: 'Chờ điểm danh', IN_PROGRESS: 'Đang trong ca', ON_TIME: 'Đúng giờ', LATE: 'Trễ',
  EARLY_LEAVE: 'Về sớm', LATE_AND_EARLY_LEAVE: 'Trễ và về sớm', ABSENT: 'Vắng',
  MISSING_CHECK_OUT: 'Thiếu lượt ra',
}
export function AttendanceResultsPage() {
  const [week, setWeek] = useState(() => monday(vietnamToday()))
  const [page, setPage] = useState(0)
  const [data, setData] = useState<ResultPage | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setError('')
    listResults(week, addDays(week, 6), page)
      .then(value => { if (active) setData(value) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được bảng công.') })
    return () => { active = false }
  }, [week, page, revision])
  useEffect(() => {
    const timer = window.setInterval(() => refresh(value => value + 1), 60000)
    return () => window.clearInterval(timer)
  }, [])
  function changeWeek(value: string) { if (value) { setWeek(monday(value)); setPage(0) } }
  return <main className="workspace attendance-results-page">
    <div className="page-heading"><div><p className="eyebrow">BẢNG CÔNG</p><h1>Kết quả điểm danh</h1>
      <p className="muted">Theo giờ hệ thống ghi nhận · Ngưỡng trễ và về sớm: quá 5 phút · Vắng sau khi ca kết thúc mà không có lượt vào.</p></div></div>
    <section className="account-card"><div className="schedule-toolbar attendance-toolbar">
      <button type="button" aria-label="Tuần trước" onClick={() => changeWeek(addDays(week, -7))}>←</button>
      <label htmlFor="results-week">Tuần bắt đầu</label><input id="results-week" type="date" value={week} onChange={event => changeWeek(event.target.value)} />
      <button type="button" aria-label="Tuần sau" onClick={() => changeWeek(addDays(week, 7))}>→</button>
      <button type="button" onClick={() => changeWeek(vietnamToday())}>Tuần này</button>
      <strong>{dateLabel(week)} – {dateLabel(addDays(week, 6))}</strong>
      <button type="button" onClick={() => refresh(value => value + 1)}>Tải lại</button>
    </div>
      {error ? <div className="table-state"><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div>
        : !data ? <p role="status" className="table-state">Đang tính kết quả điểm danh…</p>
        : data.items.length === 0 ? <div className="table-state"><h2>Chưa có ca làm trong tuần này</h2><p>Ca được phân sẽ xuất hiện tại đây.</p></div>
        : <><div className="table-scroll"><table><thead><tr><th>Nhân viên</th><th>Ca</th><th>Vào ca</th><th>Ra ca</th><th>Kết quả</th></tr></thead><tbody>
          {data.items.map(row => <tr key={row.scheduleId}>
            <td><strong>{row.employeeName}</strong></td>
            <td><strong>{row.shiftName}</strong><small className="cell-detail">{dateLabel(row.workDate)} · {instantLabel(row.startsAt)} → {instantLabel(row.endsAt)}</small></td>
            <td>{row.checkInAt ? instantLabel(row.checkInAt) : '—'}<small className="cell-detail">{arrivalLabels[row.arrival]}{row.lateMinutes > 0 && ` · ${row.lateMinutes} phút`}</small></td>
            <td>{row.checkOutAt ? instantLabel(row.checkOutAt) : '—'}<small className="cell-detail">{departureLabels[row.departure]}{row.earlyMinutes > 0 && ` · ${row.earlyMinutes} phút`}</small></td>
            <td><span className={'attendance-result ' + (row.overall === 'ABSENT' || row.overall === 'LATE' || row.overall === 'EARLY_LEAVE' || row.overall === 'LATE_AND_EARLY_LEAVE' ? 'attendance-result-alert' : '')}>{overallLabels[row.overall]}</span></td>
          </tr>)}</tbody></table></div>
          <div className="pagination"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page + 1} / {Math.max(1, data.totalPages)}</span><button type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Trang sau</button></div></>}
    </section>
  </main>
}
