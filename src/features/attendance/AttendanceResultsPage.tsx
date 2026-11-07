import { useEffect, useState } from 'react'
import { addDays, dateLabel, instantLabel, monday, vietnamToday } from '../../shared/utils/dates'
import { listAttendanceResults } from './api'
import { resultLabels, type AttendanceResultPage } from './types'
import './attendance.css'
import './capture.css'

export function AttendanceResultsPage() {
  const [week, setWeek] = useState(() => monday(vietnamToday()))
  const [page, setPage] = useState(0)
  const [data, setData] = useState<AttendanceResultPage | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => refresh(value => value + 1), 60000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    let active = true; setError(''); setData(null)
    listAttendanceResults(week, addDays(week, 6), page).then(result => { if (active) setData(result) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được bảng công.') })
    return () => { active = false }
  }, [week, page, revision])
  function changeWeek(value: string) { if (value) { setWeek(monday(value)); setPage(0) } }
  return <main className="workspace attendance-results-page"><div className="page-heading"><div><p className="eyebrow">CHẤM CÔNG</p><h1>Phân loại ca làm</h1><p className="muted">Kết quả vào/ra và số phút trễ, về sớm. Tự cập nhật mỗi phút.</p></div></div>
    <nav className="attendance-page-links" aria-label="Xem bảng công"><a href="#/attendance">Lượt điểm danh và ảnh</a><a href="#/attendance-results" aria-current="page">Phân loại ca làm</a></nav>
    <section className="account-card"><div className="attendance-filters"><button aria-label="Tuần trước" onClick={() => changeWeek(addDays(week, -7))}>←</button>
      <div><label htmlFor="result-week">Chọn tuần</label><input id="result-week" type="date" value={week} onChange={event => changeWeek(event.target.value)} /></div>
      <button aria-label="Tuần sau" onClick={() => changeWeek(addDays(week, 7))}>→</button><button onClick={() => changeWeek(vietnamToday())}>Tuần này</button><button onClick={() => refresh(value => value + 1)}>Tải lại</button>
      <p>{dateLabel(week)} – {dateLabel(addDays(week, 6))} · UTC+7</p></div>
      {error ? <div className="table-state"><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div>
        : !data ? <p role="status">Đang tải phân loại ca làm…</p>
        : !data.items.length ? <div className="table-state"><h2>Chưa có ca làm trong tuần này</h2><p>Các ca được phân sẽ xuất hiện tại đây, kể cả ca vắng không có lượt điểm danh.</p></div>
        : <><div className="attendance-result-list">{data.items.map(row => <article className="attendance-result-card" key={row.scheduleId}>
          <div><h2>{row.employeeName}</h2><p>{row.shiftName} · {dateLabel(row.workDate)}</p><small>{instantLabel(row.startsAt)} → {instantLabel(row.endsAt)}</small></div>
          <div><h3>Vào ca</h3><span className={'attendance-badge status-' + row.arrival}>{resultLabels[row.arrival]}</span><p>{row.checkInAt ? instantLabel(row.checkInAt) : 'Chưa có lượt vào'}</p>{row.lateMinutes > 0 && <small>Trễ {row.lateMinutes} phút</small>}</div>
          <div><h3>Ra ca</h3><span className={'attendance-badge status-' + row.departure}>{resultLabels[row.departure]}</span><p>{row.checkOutAt ? instantLabel(row.checkOutAt) : 'Chưa có lượt ra'}</p>{row.earlyMinutes > 0 && <small>Về sớm {row.earlyMinutes} phút</small>}</div>
          <div><h3>Kết quả ca</h3><span className={'attendance-badge status-' + row.overall}>{resultLabels[row.overall]}</span></div>
        </article>)}</div><div className="pagination"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page + 1} / {Math.max(1, data.totalPages)}</span><button disabled={page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></div></>}
    </section>
  </main>
}
