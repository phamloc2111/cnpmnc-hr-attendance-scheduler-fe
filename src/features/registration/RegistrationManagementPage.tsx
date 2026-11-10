import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { Modal } from '../../shared/components/Modal'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { addDays, dateLabel, instantLabel, monday } from '../../shared/utils/dates'
import { changeRegistrationAccess, loadManagedRegistrations } from './management-api'
import type { ManagedEmployee, ManagedWeek } from './management-api'
import './registration-management.css'

const labels: Record<ManagedEmployee['state'], string> = { OPEN: 'Đang mở tự động', CLOSED: 'Đã khóa tự động', REOPENED: 'Đã mở lại', NOT_OPEN: 'Chưa đến giờ mở', ACCOUNT_LOCKED: 'Tài khoản bị khóa' }
export function RegistrationManagementPage() {
  const [week, setWeek] = useState(''), [query, setQuery] = useState(''), [search, setSearch] = useState('')
  const [page, setPage] = useState(0), [attempt, refresh] = useState(0)
  const [data, setData] = useState<ManagedWeek | null>(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [formError, setFormError] = useState(''), [notice, setNotice] = useState('')
  const [stale, setStale] = useState(false)
  const [target, setTarget] = useState<{ employee: ManagedEmployee; reopened: boolean; week: string } | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('')
    loadManagedRegistrations(week, search, page, controller.signal).then(result => { if (!controller.signal.aborted) setData(result) })
      .catch((failure: unknown) => { if (!controller.signal.aborted) { setData(null); setError(message(failure)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [week, search, page, attempt])
  function changeWeek(value: string) { if (value) { setWeek(monday(value)); setPage(0); setNotice('') } }
  function reload() { setTarget(null); setFormError(''); setStale(false); refresh(value => value + 1) }
  async function submit() {
    if (!target || busy || stale) return
    setBusy(true); setFormError('')
    try {
      await changeRegistrationAccess(target.employee.employeeId, target.week, target.reopened, target.employee.accessRevision)
      if (!mounted.current) return
      setNotice((target.reopened ? 'Đã mở lại đăng ký cho ' : 'Đã khóa lại đăng ký của ') + target.employee.displayName + ' · Tuần ' + dateLabel(target.week) + '.')
      setTarget(null); refresh(value => value + 1)
    } catch (failure: unknown) {
      if (!mounted.current) return
      setFormError(message(failure)); if (failure instanceof ApiError && failure.status === 409) setStale(true)
    } finally { if (mounted.current) setBusy(false) }
  }
  return <main className="workspace registration-management-page">
    <div className="page-heading"><div><p className="eyebrow">ĐĂNG KÝ CA</p><h1>Quản lý đăng ký ca</h1><p className="muted">Mở lại theo từng nhân viên và tuần để hoàn tất nguyện vọng xếp lịch.</p></div></div>
    <section className="registration-management-note"><HomeIcon name="clock" size={23} /><div><strong>Tự khóa sau Chủ nhật</strong><p>Cổng đăng ký đóng sau 23:59 Chủ nhật theo giờ Việt Nam. Sau khi đóng, bạn có thể mở lại riêng cho nhân viên mình phụ trách và khóa lại khi đã chốt.</p></div></section>
    {notice && <p className="notice" role="status">{notice}</p>}
    <section className="account-card registration-management-card">
      <form className="registration-management-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setPage(0) }}>
        <div><label htmlFor="management-registration-week">Tuần đăng ký</label><input id="management-registration-week" type="date" value={data?.weekStart ?? week} disabled={loading || busy} onChange={event => changeWeek(event.target.value)} /></div>
        <div><label htmlFor="management-registration-search">Tìm nhân viên</label><input id="management-registration-search" placeholder="Tên hoặc email nhân viên" maxLength={200} value={query} disabled={busy} onChange={event => setQuery(event.target.value)} /></div>
        <button disabled={loading || busy}>Tìm kiếm</button><button type="button" disabled={loading || busy} onClick={() => { setWeek(''); setPage(0); refresh(value => value + 1) }}>Tuần hiện tại</button><button type="button" disabled={loading || busy} onClick={reload}>Tải lại</button>
      </form>
      {data && !loading && <div className="registration-management-week"><button aria-label="Tuần trước" disabled={busy} onClick={() => changeWeek(addDays(data.weekStart, -7))}><HomeIcon name="left" size={17} /></button><div><strong>{dateLabel(data.weekStart)} – {dateLabel(data.weekEnd)}</strong><small>Giờ Việt Nam (UTC+7) · Đóng tự động {instantLabel(data.closesAt)}</small></div><button aria-label="Tuần sau" disabled={busy} onClick={() => changeWeek(addDays(data.weekStart, 7))}><HomeIcon name="right" size={17} /></button></div>}
      {loading ? <p className="table-state" role="status">Đang tải đăng ký của nhân viên…</p> : error ? <div className="table-state"><p className="error" role="alert">{error}</p><button onClick={reload}>Thử lại</button></div> : data && <>
        {!data.items.length ? <div className="table-state"><h2>Chưa có nhân viên phù hợp</h2><p>Danh sách chỉ hiển thị nhân viên được phân công cho bạn. Thử từ khóa khác hoặc kiểm tra phân công quản lý.</p></div> : <ul className="registration-management-list">{data.items.map(employee => <li key={employee.employeeId}>
          <span className="registration-employee-icon"><HomeIcon name="user" size={23} /></span>
          <div className="registration-employee-name"><h2>{employee.displayName}</h2><p>{employee.selectionCount} ca đã đăng ký</p>{employee.reopenedAt && <small>Mở lại lúc {instantLabel(employee.reopenedAt)}</small>}</div>
          <span className={'registration-access-state state-' + employee.state}>{labels[employee.state]}</span>
          <div className="registration-access-actions">{employee.canReopen ? <button disabled={busy} aria-label={'Mở lại đăng ký cho ' + employee.displayName} onClick={() => { setTarget({ employee, reopened: true, week: data.weekStart }); setFormError(''); setStale(false) }}>Mở lại</button> : employee.canClose ? <button disabled={busy} aria-label={'Khóa lại đăng ký của ' + employee.displayName} onClick={() => { setTarget({ employee, reopened: false, week: data.weekStart }); setFormError(''); setStale(false) }}>Khóa lại</button> : <small>{employee.accountLocked ? 'Không thể mở lại' : 'Theo khung giờ tự động'}</small>}</div>
        </li>)}</ul>}
        <div className="pagination"><button disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page + 1} / {Math.max(1, data.totalPages)} · {data.totalElements} nhân viên</span><button disabled={busy || page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></div>
      </>}
    </section>
    {target && <Modal title={target.reopened ? 'Mở lại đăng ký ca' : 'Khóa lại đăng ký ca'} busy={busy} onClose={() => setTarget(null)}>
      <p><strong>{target.employee.displayName}</strong> · {dateLabel(target.week)} – {dateLabel(addDays(target.week, 6))}</p>
      <p>{target.reopened ? 'Nhân viên này được sửa nguyện vọng ca của tuần đã chọn cho đến khi bạn khóa lại.' : 'Nhân viên sẽ chỉ được xem nguyện vọng ca đã lưu của tuần này. Các ca đã đăng ký được giữ nguyên.'}</p>
      {formError && <p className="error" role="alert">{formError}</p>}
      <div className="modal-actions"><button disabled={busy} onClick={() => setTarget(null)}>Hủy</button>{stale ? <button onClick={reload}>Tải lại dữ liệu</button> : <button className="primary" disabled={busy} onClick={() => { void submit() }}>{busy ? 'Đang cập nhật…' : target.reopened ? 'Xác nhận mở lại' : 'Xác nhận khóa lại'}</button>}</div>
    </Modal>}
  </main>
}
function message(failure: unknown) { return failure instanceof Error ? failure.message : 'Không thể cập nhật đăng ký. Vui lòng thử lại.' }
