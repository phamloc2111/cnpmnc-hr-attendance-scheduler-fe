import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../shared/components/Modal'
import { createPosition, listPositions, setPositionStatus } from './api'
import type { Position, PositionPage } from './api'
export function PositionsPage({ canManage }: { canManage: boolean }) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PositionPage | null>(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, refresh] = useState(0)
  const [target, setTarget] = useState<Position | null>(null)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let current = true
    setData(null); setError('')
    listPositions(page, active, search).then(result => { if (current) setData(result) })
      .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : 'Không tải được danh mục.') })
    return () => { current = false }
  }, [page, active, search, revision])
  async function create(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!name.trim()) { setFormError('Tên vị trí không được để trống.'); return }
    setBusy(true); setFormError('')
    try { await createPosition(name); setName(''); setPage(0); setNotice('Đã tạo vị trí dùng chung.'); refresh(value => value + 1) }
    catch (failure: unknown) { setFormError(failure instanceof Error ? failure.message : 'Không tạo được vị trí.') }
    finally { setBusy(false) }
  }
  async function changeStatus() {
    if (!target || busy) return
    setBusy(true); setFormError('')
    try { await setPositionStatus(target); setTarget(null); setNotice('Đã cập nhật trạng thái vị trí.'); refresh(value => value + 1) }
    catch (failure: unknown) { setFormError(failure instanceof Error ? failure.message : 'Không cập nhật được vị trí.') }
    finally { setBusy(false) }
  }
  return <main className="workspace accounts-page"><div className="page-heading"><div><p className="eyebrow">DANH MỤC DÙNG CHUNG</p><h1>Vị trí công việc</h1><p className="muted">{canManage ? 'Vị trí bạn tạo được dùng cho tài khoản nhân viên và mẫu ca trên toàn hệ thống.' : 'Danh mục do quản lý tạo. Bạn có thể chọn các vị trí đang sử dụng khi tạo tài khoản hoặc mẫu ca.'}</p></div></div>
    {notice && <p role="status">{notice}</p>}
    {canManage && <form className="position-create" onSubmit={event => { void create(event) }}><div><label htmlFor="position-name">Tên vị trí</label><input id="position-name" required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Ví dụ: Thu ngân" /></div><button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Tạo vị trí'}</button></form>}
    {formError && !target && <p role="alert" className="error">{formError}</p>}
    <section className="account-card"><form className="account-filters" onSubmit={event => { event.preventDefault(); setPage(0); setSearch(query) }}>
      <div><label htmlFor="position-search">Tìm vị trí</label><input id="position-search" value={query} maxLength={120} onChange={event => setQuery(event.target.value)} /></div>
      <div><label htmlFor="position-status">Trạng thái vị trí</label><select id="position-status" value={active} onChange={event => { setActive(event.target.value); setPage(0) }}><option value="">Tất cả</option><option value="true">Đang sử dụng</option><option value="false">Ngừng sử dụng</option></select></div><button>Tìm kiếm</button></form>
      {error ? <div className="table-state"><p role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div>
        : !data ? <p className="table-state" role="status">Đang tải danh mục…</p>
        : data.items.length === 0 ? <p className="table-state">Không có vị trí phù hợp.</p>
        : <div className="table-scroll"><table><thead><tr><th>Vị trí</th><th>Trạng thái</th>{canManage && <th>Thao tác</th>}</tr></thead><tbody>{data.items.map(position => <tr key={position.id}><td><strong>{position.name}</strong></td><td>{position.active ? 'Đang sử dụng' : 'Ngừng sử dụng'}</td>{canManage && <td><button onClick={() => { setTarget(position); setFormError('') }} aria-label={(position.active ? 'Ngừng sử dụng ' : 'Sử dụng lại ') + position.name}>{position.active ? 'Ngừng sử dụng' : 'Sử dụng lại'}</button></td>}</tr>)}</tbody></table></div>}
      {data && <div className="pagination"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page + 1}/{Math.max(1, data.totalPages)}</span><button disabled={page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</button></div>}
    </section>
    {target && <Modal title={target.active ? 'Ngừng sử dụng vị trí' : 'Sử dụng lại vị trí'} busy={busy} onClose={() => { setTarget(null); setFormError('') }}>
      <p>{target.name}: {target.active ? 'không cho chọn mới; nhân viên và ca đã có vẫn được giữ nguyên.' : 'cho phép chọn khi tạo tài khoản và mẫu ca.'}</p>
      {formError && <p role="alert" className="error">{formError}</p>}
      <div className="modal-actions"><button disabled={busy} onClick={() => { setTarget(null); setFormError('') }}>Hủy</button><button className="primary" disabled={busy} onClick={() => { void changeStatus() }}>Xác nhận</button></div>
    </Modal>}
  </main>
}
