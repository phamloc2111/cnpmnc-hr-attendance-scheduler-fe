import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { dateLabel, instantLabel, monday, timeLabel } from '../../shared/utils/dates'
import { canEdit, loadCatalog, loadRegistration, sameSelection, saveRegistration } from './api'
import type { RegistrationShift, RegistrationWeek, ShiftCatalog } from './api'
import './registration.css'

export function RegistrationPage() {
  const [week, setWeek] = useState('')
  const [attempt, refresh] = useState(0)
  const [data, setData] = useState<RegistrationWeek | null>(null)
  const [selected, setSelected] = useState<RegistrationShift[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadRequired, setReloadRequired] = useState(false)
  const [page, setPage] = useState(0)
  const [catalog, setCatalog] = useState<ShiftCatalog | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [catalogAttempt, retryCatalog] = useState(0)
  const [tick, setTick] = useState(0)
  const receivedAt = useRef(0)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setNotice(''); setReloadRequired(false)
    loadRegistration(week, controller.signal).then(value => {
      if (controller.signal.aborted) return
      receivedAt.current = performance.now(); setData(value); setSelected(value.shifts)
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) { setData(null); setSelected([]); setError(message(failure)) }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [week, attempt])
  useEffect(() => {
    const controller = new AbortController()
    setCatalog(null); setCatalogError('')
    loadCatalog(page, controller.signal).then(value => { if (!controller.signal.aborted) setCatalog(value) })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setCatalogError(message(failure)) })
    return () => controller.abort()
  }, [page, catalogAttempt])
  useEffect(() => {
    const update = () => setTick(value => value + 1)
    const interval = window.setInterval(update, 1000)
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  // tick rerenders when the server's deadline passes, including after a background tab resumes.
  void tick
  const editable = !!data && canEdit(data, performance.now() - receivedAt.current) && !loading && !saving && !reloadRequired
  const dirty = !!data && !sameSelection(selected, data.shifts)
  function toggle(shift: RegistrationShift) {
    if (!editable) return
    setError(''); setNotice('')
    setSelected(previous => previous.some(item => item.id === shift.id) ? previous.filter(item => item.id !== shift.id) : [...previous, shift])
  }
  async function save() {
    if (!data || !editable || !dirty) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await saveRegistration(data.weekStart, data.revision, selected.map(shift => shift.id))
      if (!mounted.current) return
      receivedAt.current = performance.now(); setData(result); setSelected(result.shifts)
      setNotice(result.shifts.length ? 'Đã lưu đăng ký ca cho tuần này.' : 'Đã xóa các ca đăng ký của tuần này.')
    } catch (failure: unknown) {
      if (!mounted.current) return
      setError(message(failure))
      if (failure instanceof ApiError && failure.status === 409) setReloadRequired(true)
    } finally { if (mounted.current) setSaving(false) }
  }
  return <main className="workspace employee-home registration-page">
    <header className="home-hero registration-hero">
      <div className="home-hero-top"><a className="home-brand" href="#/employee"><span>S</span><strong>ShiftSync</strong></a><a className="registration-home" href="#/employee"><HomeIcon name="left" size={16} />Trang chủ</a></div>
      <div className="registration-heading"><p>CHỦ ĐỘNG LỊCH LÀM VIỆC</p><h1>Đăng ký ca</h1><span>Chọn ca mong muốn cho tuần kế tiếp</span></div>
    </header>
    <div className="registration-content">
      <section className="registration-card registration-week" aria-label="Tuần đăng ký">
        <div><label htmlFor="registration-week">Tuần đăng ký</label><input id="registration-week" type="date" value={data?.weekStart ?? week} disabled={loading || saving} onChange={event => { if (event.target.value) setWeek(monday(event.target.value)) }} /></div>
        <div className="registration-week-actions"><button disabled={loading || saving} onClick={() => { setWeek(''); refresh(value => value + 1) }}>Tuần kế tiếp</button><button disabled={loading || saving} onClick={() => refresh(value => value + 1)}><HomeIcon name="refresh" size={15} />Tải lại</button></div>
        {data && !loading && <strong className="registration-range">{dateLabel(data.weekStart)} – {dateLabel(data.weekEnd)}</strong>}
      </section>
      {loading ? <p className="registration-card" role="status">Đang tải đăng ký ca…</p> : data && <section className={'registration-window ' + (editable || saving ? 'open' : 'closed')} aria-label="Thời gian đăng ký">
        <span className="registration-window-icon"><HomeIcon name="clock" size={24} /></span><div><strong>{canEdit(data, performance.now() - receivedAt.current) ? 'Đang mở đăng ký' : 'Chỉ xem đăng ký'}</strong>
          <p>Mở Chủ nhật {instantLabel(data.opensAt)} · Đóng {instantLabel(data.closesAt)} (UTC+7)</p>
          <small>Được lưu và chỉnh sửa đến hết 23:59 Chủ nhật. Ngoài thời gian này chỉ được xem.</small></div>
      </section>}
      {error && <div className="registration-card registration-error"><p role="alert">{error}</p>{!data && <button onClick={() => refresh(value => value + 1)}>Thử lại</button>}{reloadRequired && <p>Bản chọn của bạn vẫn được giữ. Bấm “Tải lại” để lấy dữ liệu mới trước khi chỉnh sửa tiếp.</p>}</div>}
      {notice && <p className="registration-notice" role="status">{notice}</p>}
      {data && !loading && <div className="registration-columns">
        <section className="registration-card registration-catalog" aria-label="Các ca có thể đăng ký">
          <div className="registration-section-heading"><div><h2>Chọn ca làm</h2><p>Ca mong muốn trong tuần đã chọn</p></div><HomeIcon name="calendar" size={25} /></div>
          {catalogError ? <div><p role="alert">{catalogError}</p><button onClick={() => retryCatalog(value => value + 1)}>Thử lại danh mục</button></div> : !catalog ? <p role="status">Đang tải danh mục ca…</p> : <>
            {!catalog.items.length && <p className="registration-empty">Chưa có mẫu ca để đăng ký. Vui lòng liên hệ quản lý.</p>}
            <div className="registration-options">{catalog.items.map(shift => {
              const checked = selected.some(item => item.id === shift.id)
              return <label key={shift.id} className={'registration-option' + (checked ? ' selected' : '')}>
                <input type="checkbox" aria-label={'Đăng ký ' + shift.name} checked={checked} disabled={!editable || (!checked && selected.length >= 100)} onChange={() => toggle(shift)} />
                <span><strong>{shift.name}</strong><span className="registration-time">{timeLabel(shift.startTime)} – {timeLabel(shift.endTime)}{shift.overnight && <small> · Qua đêm</small>}</span><span>{shift.requiredPosition || 'Không yêu cầu vị trí'}</span><small>Nghỉ {shift.breakMinutes} phút · Làm {shift.workingMinutes} phút</small></span>
              </label>
            })}</div>
            {catalog.totalPages > 1 && <div className="registration-pagination"><button disabled={page === 0 || saving} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page + 1} / {catalog.totalPages}</span><button disabled={page + 1 >= catalog.totalPages || saving} onClick={() => setPage(value => value + 1)}>Trang sau</button></div>}
          </>}
        </section>
        <aside className="registration-card registration-selection" aria-label="Ca đã chọn">
          <div className="registration-section-heading"><div><h2>Ca đã chọn</h2><p>{selected.length} / 100 ca</p></div><span className="registration-count">{selected.length}</span></div>
          <p className="registration-explanation">Đây là nguyện vọng đăng ký, chưa phải lịch được phân. Xem ca chính thức tại <a href="#/my-schedule">Lịch của tôi</a>.</p>
          {selected.length ? <ul>{selected.map(shift => <li key={shift.id}><div><strong>{shift.name}</strong><small>{timeLabel(shift.startTime)} – {timeLabel(shift.endTime)}{shift.overnight ? ' · Qua đêm' : ''}</small></div><button aria-label={'Bỏ ' + shift.name} disabled={!editable} onClick={() => toggle(shift)}><HomeIcon name="close" size={16} /></button></li>)}</ul> : <p className="registration-empty">Bạn chưa chọn ca nào cho tuần này.</p>}
          <button className="registration-save" disabled={!editable || !dirty} onClick={() => { void save() }}>{saving ? 'Đang lưu…' : 'Lưu đăng ký'}</button>
          <small className="registration-save-note">{reloadRequired ? 'Cần tải lại dữ liệu để tiếp tục.' : dirty ? 'Bạn có thay đổi chưa lưu.' : 'Các thay đổi chỉ có hiệu lực khi bấm lưu.'}</small>
        </aside>
      </div>}
    </div>
    <nav className="home-bottom-nav registration-nav" aria-label="Điều hướng nhân viên"><a href="#/employee"><span><HomeIcon name="dashboard" size={21} /></span>Trang chủ</a><a href="#/my-schedule"><span><HomeIcon name="calendar" size={21} /></span>Lịch của tôi</a><a className="active" href="#/registrations" aria-current="page"><span><HomeIcon name="check" size={21} /></span>Đăng ký ca</a></nav>
  </main>
}
function message(failure: unknown) { return failure instanceof Error ? failure.message : 'Không thể tải dữ liệu. Vui lòng thử lại.' }
