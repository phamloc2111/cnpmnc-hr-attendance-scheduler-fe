import { useEffect, useState } from 'react'
import { addDays, dateLabel, instantLabel, monday, vietnamToday } from '../../shared/utils/dates'
import { listSchedules } from '../schedule/api'
import type { WorkSchedule } from '../schedule/types'
import { listMyEvents, recordAttendance } from './api'
import type { AttendanceEvent } from './api'
import './attendance.css'

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Trình duyệt không hỗ trợ định vị. Hãy dùng trình duyệt có GPS và kết nối HTTPS.')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, maximumAge: 0, timeout: 15000,
    })
  })
}
function locationError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 1) return 'Bạn chưa cấp quyền định vị. Hãy cho phép trang web truy cập vị trí rồi gửi lại; lượt này chưa được ghi nhận.'
    if (error.code === 2) return 'Không xác định được vị trí hiện tại. Hãy bật GPS và gửi lại; lượt này chưa được ghi nhận.'
    if (error.code === 3) return 'Định vị quá thời gian chờ. Hãy thử lại; lượt này chưa được ghi nhận.'
  }
  return error instanceof Error ? error.message : 'Không thể lấy vị trí hiện tại; lượt này chưa được ghi nhận.'
}
async function allSchedules(from: string, to: string) {
  const first = await listSchedules(from, to)
  const pages = await Promise.all(Array.from({ length: first.totalPages - 1 }, (_, index) => listSchedules(from, to, index + 1)))
  return [first, ...pages].flatMap(page => page.items)
}

export function AttendancePage() {
  const [week, setWeek] = useState(() => monday(vietnamToday()))
  const [schedules, setSchedules] = useState<WorkSchedule[] | null>(null)
  const [events, setEvents] = useState<AttendanceEvent[]>([])
  const [file, setFile] = useState<{ scheduleId: string; image: File } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, refresh] = useState(0)
  useEffect(() => {
    let active = true
    setSchedules(null); setError(''); setFile(null)
    Promise.all([allSchedules(week, addDays(week, 6)), listMyEvents(week, addDays(week, 6))])
      .then(([shifts, recorded]) => { if (active) { setSchedules(shifts); setEvents(recorded) } })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được lịch điểm danh.') })
    return () => { active = false }
  }, [week, revision])
  async function send(scheduleId: string, type: AttendanceEvent['type']) {
    if (busy || file?.scheduleId !== scheduleId) return
    setBusy(true); setError(''); setNotice('')
    try {
      // Ask for a fresh GPS reading only when the employee sends this particular image.
      const position = await currentPosition()
      const saved = await recordAttendance(scheduleId, type, file.image, position)
      setEvents(previous => [...previous, saved]); setFile(null)
      setNotice(type === 'CHECK_IN' ? 'Đã ghi nhận lượt vào ca.' : 'Đã ghi nhận lượt ra ca.')
    } catch (failure: unknown) { setError(locationError(failure)) }
    finally { setBusy(false) }
  }
  function changeWeek(value: string) { if (value) setWeek(monday(value)) }
  return <main className="workspace attendance-page">
    <div className="page-heading"><div><p className="eyebrow">ĐIỂM DANH</p><h1>Chấm công bằng ảnh Timemark</h1>
      <p className="muted">Chọn ảnh có sẵn hoặc chụp ảnh mới. Vị trí hiện tại được lấy khi bạn bấm gửi cho cả lượt vào và ra.</p></div></div>
    {notice && <p className="success" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="schedule-toolbar attendance-toolbar">
      <button type="button" aria-label="Tuần trước" onClick={() => changeWeek(addDays(week, -7))}>←</button>
      <label htmlFor="attendance-week">Tuần bắt đầu</label><input id="attendance-week" type="date" value={week} onChange={event => changeWeek(event.target.value)} />
      <button type="button" aria-label="Tuần sau" onClick={() => changeWeek(addDays(week, 7))}>→</button>
      <button type="button" onClick={() => changeWeek(vietnamToday())}>Tuần này</button>
      <strong>{dateLabel(week)} – {dateLabel(addDays(week, 6))}</strong>
      <button type="button" onClick={() => refresh(value => value + 1)}>Tải lại</button>
    </div>
    {!schedules ? !error && <p role="status">Đang tải lịch điểm danh…</p>
      : schedules.length === 0 ? <section className="account-card attendance-empty"><h2>Chưa có ca làm trong tuần này</h2><p>Ca được phân sẽ xuất hiện tại đây.</p></section>
      : <div className="attendance-grid">{schedules.map(schedule => {
        const checkIn = events.find(event => event.scheduleId === schedule.id && event.type === 'CHECK_IN')
        const checkOut = events.find(event => event.scheduleId === schedule.id && event.type === 'CHECK_OUT')
        const type = checkIn ? 'CHECK_OUT' : 'CHECK_IN'
        const ended = Date.now() >= Date.parse(schedule.endsAt)
        const canSend = !checkOut && (checkIn || !ended)
        return <section className="account-card attendance-card" key={schedule.id}>
          <div className="attendance-card-heading"><div><small>{dateLabel(schedule.workDate)}</small><h2>{schedule.shiftName}</h2><p>{instantLabel(schedule.startsAt)} → {instantLabel(schedule.endsAt)}</p></div>
            <span className="attendance-state">{checkOut ? 'Đã hoàn tất' : checkIn ? 'Đã vào ca' : ended ? 'Chưa điểm danh' : 'Chờ vào ca'}</span></div>
          <div className="attendance-records"><span>Vào: {checkIn ? instantLabel(checkIn.receivedAt) : 'Chưa có'}</span><span>Ra: {checkOut ? instantLabel(checkOut.receivedAt) : 'Chưa có'}</span></div>
          {canSend && <div className="attendance-actions"><label htmlFor={'photo-' + schedule.id}>Ảnh Timemark (JPEG hoặc PNG, tối đa 5 MB)</label>
            <input key={checkIn?.id ?? 'new'} id={'photo-' + schedule.id} type="file" accept="image/jpeg,image/png" disabled={busy}
              onChange={event => { const image = event.target.files?.[0]; setFile(image ? { scheduleId: schedule.id, image } : null) }} />
            <button className="primary" type="button" disabled={busy || file?.scheduleId !== schedule.id}
              onClick={() => { void send(schedule.id, type) }}>{busy && file?.scheduleId === schedule.id ? 'Đang lấy vị trí và gửi…' : type === 'CHECK_IN' ? 'Điểm danh vào' : 'Điểm danh ra'}</button></div>}
        </section>
      })}</div>}
  </main>
}
