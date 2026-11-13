import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../shared/components/Modal'
import { addDays, dateLabel, instantLabel, monday, timeLabel, vietnamToday } from '../../shared/utils/dates'
import { listAccounts } from '../accounts'
import { useAuth } from '../auth/AuthProvider'
import { PositionSelect } from '../positions'
import { assignShift, cancelSchedule, createShift, generateSchedule, listSchedules, listShifts } from './api'
import type { GenerationResult, Page, Shift, WorkSchedule } from './types'
import './schedule.css'

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Không thể tải dữ liệu.' }
export function SchedulePage({ employee = false }: { employee?: boolean }) {
  const { user } = useAuth()
  const [week, setWeek] = useState(() => monday(vietnamToday()))
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<WorkSchedule> | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  const [modal, setModal] = useState<'assign' | 'shifts' | 'generate' | null>(null)
  const [cancel, setCancel] = useState<WorkSchedule | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    setData(null); setError('')
    listSchedules(week, addDays(week, 6), page).then(value => { if (active) setData(value) })
      .catch((failure: unknown) => { if (active) setError(errorMessage(failure)) })
    return () => { active = false }
  }, [week, page, revision])
  function changeWeek(value: string) { if (value) { setWeek(monday(value)); setPage(0) } }
  async function confirmCancel() {
    if (!cancel || busy) return
    setBusy(true); setError('')
    try { await cancelSchedule(cancel.id); setCancel(null); setNotice('Đã hủy ca làm.'); refresh(value => value + 1) }
    catch (failure: unknown) { setError(errorMessage(failure)) }
    finally { setBusy(false) }
  }
  return <main className="workspace accounts-page schedule-page">
    <div className="page-heading"><div><p className="eyebrow">XẾP LỊCH</p><h1>{employee ? 'Lịch của tôi' : 'Lịch làm việc'}</h1><p className="muted">Theo tuần · Giờ Việt Nam (UTC+7) · Ngày làm việc là ngày bắt đầu ca.</p></div>
      {!employee && <div className="actions"><button onClick={() => setModal('shifts')}>Mẫu ca</button>{user?.role === 'MANAGER' && <button onClick={() => setModal('generate')}>Xếp lịch tự động</button>}<button className="primary" onClick={() => setModal('assign')}>Phân ca</button></div>}</div>
    {notice && <p role="status" className="success">{notice}</p>}
    <section className="account-card">
      <div className="schedule-toolbar"><button aria-label="Tuần trước" onClick={() => changeWeek(addDays(week, -7))}>←</button>
        <div className="schedule-week-picker"><label htmlFor="schedule-week">Chọn tuần</label><input id="schedule-week" type="date" value={week} onChange={event => changeWeek(event.target.value)} /></div>
        <button aria-label="Tuần sau" onClick={() => changeWeek(addDays(week, 7))}>→</button><button onClick={() => changeWeek(vietnamToday())}>Tuần này</button>
        <strong>{dateLabel(week)} – {dateLabel(addDays(week, 6))}</strong><button onClick={() => refresh(value => value + 1)}>Tải lại</button></div>
      {error && !cancel ? <div className="table-state"><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div>
        : !data ? <p className="table-state" role="status">Đang tải lịch làm việc…</p>
        : data.items.length === 0 ? <div className="table-state"><h2>Chưa có lịch trong tuần này</h2><p>{employee ? 'Lịch sẽ xuất hiện khi quản lý phân ca cho bạn.' : 'Chọn Phân ca để thêm lịch làm cho nhân viên.'}</p></div>
        : <><div className="table-scroll"><table><thead><tr><th>Ngày bắt đầu</th>{!employee && <th>Nhân viên</th>}<th>Ca làm</th><th>Thời gian</th><th>Giờ làm</th>{!employee && <th>Thao tác</th>}</tr></thead><tbody>
          {data.items.map(row => <tr key={row.id}><td>{dateLabel(row.workDate)}</td>{!employee && <td><strong>{row.employeeName}</strong></td>}
            <td><strong>{row.shiftName}</strong><small className="cell-detail">Nghỉ {row.breakMinutes} phút</small></td>
            <td>{instantLabel(row.startsAt)} → {instantLabel(row.endsAt)}</td><td>{row.workingMinutes} phút</td>
            {!employee && <td><button onClick={() => { setCancel(row); setError('') }} aria-label={'Hủy ca ' + row.employeeName + ' ' + row.shiftName}>Hủy ca</button></td>}</tr>)}
        </tbody></table></div><Pager page={data.page} pages={data.totalPages} onChange={setPage} /></>}
    </section>
    {modal === 'shifts' && <ShiftLibrary onClose={() => setModal(null)} />}
    {modal === 'generate' && <ScheduleGeneration week={week} onClose={() => setModal(null)} onSaved={result => {
      setModal(null)
      setNotice(`Đã xếp ${result.createdCount} lượt ca.${result.belowMinimumEmployeeCount ? ` ${result.belowMinimumEmployeeCount} nhân viên chưa đạt giờ tối thiểu mục tiêu.` : ''}`)
      refresh(value => value + 1)
    }} />}
    {modal === 'assign' && <Assignment initialDate={week} onClose={() => setModal(null)} onSaved={date => { setModal(null); changeWeek(date); setNotice('Đã phân ca cho nhân viên.'); refresh(value => value + 1) }} />}
    {cancel && <Modal title="Hủy ca làm" busy={busy} onClose={() => { setCancel(null); setError('') }}>
      <p>Hủy ca {cancel.shiftName} của {cancel.employeeName} ngày {dateLabel(cancel.workDate)}?</p>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions"><button disabled={busy} onClick={() => { setCancel(null); setError('') }}>Giữ lại</button><button className="danger" disabled={busy} onClick={() => { void confirmCancel() }}>{busy ? 'Đang hủy…' : 'Xác nhận hủy'}</button></div>
    </Modal>}
  </main>
}
function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (value: number) => void }) {
  return <div className="pagination"><button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>Trang trước</button><span>Trang {page + 1} / {Math.max(1, pages)}</span><button type="button" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Trang sau</button></div>
}
function ScheduleGeneration({ week, onClose, onSaved }: { week: string; onClose: () => void; onSaved: (result: GenerationResult) => void }) {
  const [page, setPage] = useState(0)
  const [shifts, setShifts] = useState<Page<Shift> | null>(null)
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setShifts(null); setError('')
    listShifts(page).then(value => { if (active) setShifts(value) })
      .catch((failure: unknown) => { if (active) setError(errorMessage(failure)) })
    return () => { active = false }
  }, [page])
  function toggle(value: string, current: string[], update: (value: string[]) => void) {
    update(current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  }
  async function generate(event: FormEvent) {
    event.preventDefault()
    if (busy || !selectedShifts.length || !selectedDates.length) {
      setError('Hãy chọn ít nhất một mẫu ca và một ngày trong tuần.')
      return
    }
    setBusy(true); setError('')
    try { onSaved(await generateSchedule({ weekStart: week, shiftTemplateIds: selectedShifts, workDates: selectedDates })) }
    catch (failure: unknown) { setError(errorMessage(failure)) }
    finally { setBusy(false) }
  }
  return <Modal title="Xếp lịch tự động" busy={busy} onClose={onClose}>
    <p className="muted">Chỉ nhân viên đã đăng ký mẫu ca cho tuần này và phù hợp vị trí mới được chọn. Hệ thống chỉ lưu khi đủ người cho tất cả ca đã chọn.</p>
    <form onSubmit={event => { void generate(event) }}>
      <fieldset disabled={busy} className="schedule-fields">
        <h3>Ngày cần xếp</h3>
        <div className="generation-options">{Array.from({ length: 7 }, (_, index) => addDays(week, index)).map(date =>
          <label key={date}><input type="checkbox" checked={selectedDates.includes(date)}
            onChange={() => toggle(date, selectedDates, setSelectedDates)} />{dateLabel(date)}</label>)}</div>
        <h3>Mẫu ca cần xếp</h3>
        {!shifts ? !error && <p role="status">Đang tải mẫu ca…</p> : <>
          <div className="generation-options">{shifts.items.map(shift => <label key={shift.id}>
            <input type="checkbox" checked={selectedShifts.includes(shift.id)} disabled={!shift.requiredPositionId}
              onChange={() => toggle(shift.id, selectedShifts, setSelectedShifts)} />
            {shift.name} · {shift.requiredHeadcount} người · {shift.requiredPosition ?? 'Thiếu vị trí'}
          </label>)}</div>
          {shifts.totalPages > 1 && <Pager page={page} pages={shifts.totalPages} onChange={setPage} />}
        </>}
        {error && <p role="alert" className="error">{error}</p>}
        <div className="modal-actions"><button type="button" onClick={onClose}>Hủy</button>
          <button className="primary" type="submit" disabled={busy || !selectedShifts.length || !selectedDates.length}>
            {busy ? 'Đang xếp…' : 'Xác nhận xếp lịch'}
          </button></div>
      </fieldset>
    </form>
  </Modal>
}
function ShiftLibrary({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<Shift> | null>(null)
  const [revision, refresh] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('17:00')
  const [rest, setRest] = useState('60')
  const [headcount, setHeadcount] = useState('1')
  const [position, setPosition] = useState('')
  const [overnight, setOvernight] = useState(false)
  useEffect(() => {
    let active = true
    setData(null); setError('')
    listShifts(page).then(value => { if (active) setData(value) }).catch((failure: unknown) => { if (active) setError(errorMessage(failure)) })
    return () => { active = false }
  }, [page, revision])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const minutes = (value: string) => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1])
    const duration = (minutes(end) - minutes(start) + 1440) % 1440
    if (!name.trim() || !duration || Number(rest) >= duration) { setError('Tên ca không được trống, giờ phải khác nhau và thời gian nghỉ phải ngắn hơn ca làm.'); return }
    if (!position.trim() || !Number.isInteger(Number(headcount)) || Number(headcount) < 1) {
      setError('Vui lòng nhập vị trí cần và số người cần là số nguyên, ít nhất 1.'); return
    }
    if ((minutes(end) < minutes(start)) !== overnight) {
      setError('Chỉ đánh dấu ca qua đêm khi giờ kết thúc nhỏ hơn giờ bắt đầu.'); return
    }
    setBusy(true); setError('')
    try { await createShift({ name: name.trim(), startTime: start, endTime: end, breakMinutes: Number(rest), requiredHeadcount: Number(headcount), requiredPositionId: position, overnight }); setName(''); setPage(0); refresh(value => value + 1) }
    catch (failure: unknown) { setError(errorMessage(failure)) }
    finally { setBusy(false) }
  }
  return <Modal title="Mẫu ca làm việc" busy={busy} onClose={onClose}>
    <p className="muted">Nhập nhu cầu nhân sự cho ca. Nếu kết thúc vào ngày hôm sau, hãy đánh dấu Ca qua đêm. Mẫu ca dùng chung cho quản lý và quản trị.</p>
    <form onSubmit={event => { void save(event) }}><fieldset disabled={busy} className="schedule-fields"><div className="form-grid">
      <div className="full-width"><label htmlFor="shift-name">Tên ca</label><input id="shift-name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></div>
      <div><label htmlFor="shift-start">Giờ bắt đầu</label><input id="shift-start" type="time" required value={start} onChange={event => setStart(event.target.value)} /></div>
      <div><label htmlFor="shift-end">Giờ kết thúc</label><input id="shift-end" type="time" required value={end} onChange={event => setEnd(event.target.value)} /></div>
      <div><label htmlFor="shift-headcount">Số người cần</label><input id="shift-headcount" type="number" min="1" step="1" required value={headcount} onChange={event => setHeadcount(event.target.value)} /></div>
      <PositionSelect id="shift-position" label="Vị trí cần" value={position} onChange={setPosition} disabled={busy} required />
      <div className="full-width"><label className="shift-overnight" htmlFor="shift-overnight"><input id="shift-overnight" type="checkbox" checked={overnight} onChange={event => setOvernight(event.target.checked)} />Ca qua đêm</label><small className="muted">Giờ kết thúc phải nhỏ hơn giờ bắt đầu; ca kết thúc vào ngày hôm sau.</small></div>
      <div><label htmlFor="shift-rest">Nghỉ trong ca (phút)</label><input id="shift-rest" type="number" min="0" max="1439" step="1" required value={rest} onChange={event => setRest(event.target.value)} /></div>
    </div><div className="modal-actions"><button className="primary" type="submit">{busy ? 'Đang lưu…' : 'Tạo mẫu ca'}</button></div></fieldset></form>
    {error && <div role="alert" className="error">{error} <button onClick={() => refresh(value => value + 1)}>Tải lại danh sách</button></div>}
    <h3>Danh sách mẫu ca</h3>
    {!data ? !error && <p role="status">Đang tải mẫu ca…</p> : data.items.length === 0 ? <p>Chưa có mẫu ca.</p> : <>
      <ul className="shift-list">{data.items.map(shift => <li key={shift.id}><strong>{shift.name}</strong><span>{shift.requiredHeadcount} người · {shift.requiredPosition ?? 'Chưa khai báo vị trí'}</span><span>{timeLabel(shift.startTime)} – {timeLabel(shift.endTime)}{shift.overnight && ' (+1 ngày)'} · nghỉ {shift.breakMinutes} phút · làm {shift.workingMinutes} phút</span></li>)}</ul>
      <Pager page={page} pages={data.totalPages} onChange={setPage} /></>}
  </Modal>
}
function Assignment({ initialDate, onClose, onSaved }: { initialDate: string; onClose: () => void; onSaved: (date: string) => void }) {
  const [employeeId, setEmployeeId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [query, setQuery] = useState('')
  const [employees, setEmployees] = useState<{ id: string; displayName: string; email: string }[] | null>(null)
  const [employeePage, setEmployeePage] = useState(0)
  const [employeePages, setEmployeePages] = useState(0)
  const [employeeError, setEmployeeError] = useState('')
  const [shifts, setShifts] = useState<Page<Shift> | null>(null)
  const [shiftPage, setShiftPage] = useState(0)
  const [shiftId, setShiftId] = useState('')
  const [shiftError, setShiftError] = useState('')
  const [revision, refresh] = useState(0)
  const [date, setDate] = useState(initialDate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setEmployees(null); setEmployeeError('')
    const timer = window.setTimeout(() => {
      listAccounts({ q: query, role: 'EMPLOYEE', locked: 'false', page: employeePage }, 10)
        .then(value => { if (active) { setEmployees(value.items); setEmployeePages(value.totalPages) } })
        .catch((failure: unknown) => { if (active) setEmployeeError(errorMessage(failure)) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, employeePage, revision])
  useEffect(() => {
    let active = true
    setShifts(null); setShiftError('')
    listShifts(shiftPage).then(value => { if (active) setShifts(value) })
      .catch((failure: unknown) => { if (active) setShiftError(errorMessage(failure)) })
    return () => { active = false }
  }, [shiftPage, revision])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!employeeId || !shiftId) { setError('Vui lòng chọn nhân viên và mẫu ca.'); return }
    setBusy(true); setError('')
    try { await assignShift(employeeId, shiftId, date); onSaved(date) }
    catch (failure: unknown) { setError(errorMessage(failure)) }
    finally { setBusy(false) }
  }
  return <Modal title="Phân ca làm việc" busy={busy} onClose={onClose}><form onSubmit={event => { void save(event) }}>
    <fieldset disabled={busy} className="schedule-fields">
      <label htmlFor="assign-employee">Nhân viên</label>
      <input id="assign-employee" placeholder="Tìm theo tên hoặc email" value={query} onChange={event => { setQuery(event.target.value); setEmployeeId(''); setEmployeeName(''); setEmployeePage(0) }} />
      {employeeId ? <p className="selected-person">Đã chọn: {employeeName} <button type="button" onClick={() => setEmployeeId('')}>Chọn lại</button></p>
        : employeeError ? <p role="alert">{employeeError} <button type="button" onClick={() => refresh(value => value + 1)}>Thử lại</button></p>
        : !employees ? <p role="status">Đang tìm nhân viên…</p>
        : <><ul className="employee-options" aria-label="Nhân viên có thể phân ca">{employees.map(person => <li key={person.id}><button type="button" onClick={() => { setEmployeeId(person.id); setEmployeeName(person.displayName) }}><strong>{person.displayName}</strong><small>{person.email}</small></button></li>)}</ul>
          {employees.length === 0 ? <p>Không tìm thấy nhân viên đang hoạt động.</p> : <Pager page={employeePage} pages={employeePages} onChange={setEmployeePage} />}</>}
      <label htmlFor="assign-shift">Mẫu ca</label>
      {shiftError ? <p role="alert">{shiftError} <button type="button" onClick={() => refresh(value => value + 1)}>Thử lại</button></p>
        : !shifts ? <p role="status">Đang tải mẫu ca…</p>
        : <><select id="assign-shift" required value={shiftId} onChange={event => setShiftId(event.target.value)}><option value="">Chọn mẫu ca</option>{shifts.items.map(shift => <option key={shift.id} value={shift.id}>{shift.name} · {shift.requiredHeadcount} người · {shift.requiredPosition ?? 'Chưa khai báo vị trí'} · {timeLabel(shift.startTime)}–{timeLabel(shift.endTime)}{shift.overnight ? ' (+1 ngày)' : ''}</option>)}</select>
          {shifts.totalPages > 1 && <Pager page={shiftPage} pages={shifts.totalPages} onChange={value => { setShiftPage(value); setShiftId('') }} />}
          {shifts.items.length === 0 && <p>Chưa có mẫu ca. Đóng hộp thoại và vào Mẫu ca để tạo trước.</p>}</>}
      <label htmlFor="assign-date">Ngày bắt đầu ca</label><input id="assign-date" type="date" required value={date} onChange={event => setDate(event.target.value)} />
      <small className="muted">Ca qua đêm kết thúc vào ngày tiếp theo. Hệ thống kiểm tra trùng giờ với mọi ca đã phân.</small>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions"><button type="button" onClick={onClose}>Hủy</button><button className="primary" type="submit" disabled={!employeeId || !shiftId || !date}>{busy ? 'Đang lưu…' : 'Lưu phân ca'}</button></div>
    </fieldset></form></Modal>
}
