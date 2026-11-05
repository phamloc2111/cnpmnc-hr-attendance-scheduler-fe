import { useEffect, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { roleLabels } from '../auth'
import type { Role, User } from '../auth'
import { AccountEditor } from './AccountEditor'
import { listAccounts, setAccountLocked } from './api'
import type { Account, AccountFilters, AccountPage } from './types'

export function AccountsPage({ actor }: { actor: User }) {
  const isAdmin = actor.role === 'ADMIN'
  const [filters, setFilters] = useState<AccountFilters>({ q: '', role: '', locked: '', page: 0 })
  const [query, setQuery] = useState('')
  const [data, setData] = useState<AccountPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [editor, setEditor] = useState<{ account: Account | null } | null>(null)
  const [locking, setLocking] = useState<Account | null>(null)
  const [lockBusy, setLockBusy] = useState(false)
  const [lockError, setLockError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listAccounts(filters).then(page => {
      if (!active) return
      if (page.items.length === 0 && filters.page > 0) {
        setFilters(value => ({ ...value, page: Math.max(0, page.totalPages - 1) }))
      } else setData(page)
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : 'Không thể tải danh sách tài khoản')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, attempt])

  function refresh() { setAttempt(value => value + 1) }
  async function confirmLock() {
    if (!locking || lockBusy) return
    setLockBusy(true)
    setLockError('')
    try {
      await setAccountLocked(locking)
      setNotice(locking.locked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản và thu hồi các phiên đăng nhập.')
      setLocking(null)
      refresh()
    } catch (failure: unknown) {
      setLockError(failure instanceof Error ? failure.message : 'Không thể thay đổi trạng thái tài khoản')
    } finally { setLockBusy(false) }
  }

  return <main className="workspace accounts-page">
    <div className="page-heading"><div><p className="eyebrow">ĐỘI NGŨ</p>
      <h1>{isAdmin ? 'Tài khoản' : 'Nhân viên'}</h1>
      <p className="muted">{isAdmin ? 'Quản lý tài khoản, vai trò và phân công người quản lý.' : 'Quản lý nhân viên được phân công cho bạn.'}</p></div>
      <button className="primary" onClick={() => { setNotice(''); setEditor({ account: null }) }}>Tạo tài khoản</button></div>
    {notice && <p className="notice" role="status">{notice}</p>}
    <section className="account-card" aria-label="Danh sách tài khoản">
      <form className="account-filters" onSubmit={event => {
        event.preventDefault(); setFilters(value => ({ ...value, q: query.trim(), page: 0 }))
      }}>
        <div className="search-filter"><label htmlFor="accounts-search">Tìm tài khoản</label>
          <input id="accounts-search" type="search" maxLength={100} value={query} placeholder="Họ tên hoặc email" onChange={event => setQuery(event.target.value)} /></div>
        {isAdmin && <div><label htmlFor="accounts-role">Vai trò</label>
          <select id="accounts-role" value={filters.role} onChange={event => setFilters(value => ({ ...value, role: event.target.value as '' | Role, page: 0 }))}>
            <option value="">Tất cả vai trò</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></div>}
        <div><label htmlFor="accounts-status">Trạng thái</label>
          <select id="accounts-status" value={filters.locked} onChange={event => setFilters(value => ({ ...value, locked: event.target.value as AccountFilters['locked'], page: 0 }))}>
            <option value="">Tất cả trạng thái</option><option value="false">Đang hoạt động</option><option value="true">Đã khóa</option>
          </select></div>
        <button type="submit">Tìm kiếm</button>
      </form>
      {loading ? <p className="table-state" role="status">Đang tải danh sách…</p>
        : error ? <div className="table-state"><p className="error" role="alert">{error}</p><button onClick={refresh}>Thử lại</button></div>
        : !data || data.items.length === 0 ? <div className="table-state"><h2>Chưa có tài khoản phù hợp</h2><p className="muted">Thử thay đổi bộ lọc hoặc tạo tài khoản mới.</p></div>
        : <><div className="table-scroll"><table><thead><tr>
          <th scope="col">Họ tên / Email</th><th scope="col">Vai trò</th><th scope="col">Vị trí / Kỹ năng</th>
          <th scope="col">Trạng thái</th><th scope="col">Thao tác</th>
        </tr></thead><tbody>{data.items.map(account => <tr key={account.id}>
          <td><strong>{account.displayName}</strong><span className="cell-detail">{account.email}</span></td>
          <td>{roleLabels[account.role]}</td>
          <td>{account.role === 'EMPLOYEE' ? <>{account.position || 'Chưa có vị trí'}<div className="skill-tags">{account.skills.map(skill => <span key={skill}>{skill}</span>)}</div></> : '—'}</td>
          <td><span className={'status-badge ' + (account.locked ? 'locked' : 'enabled')}>{account.locked ? 'Đã khóa' : 'Đang hoạt động'}</span></td>
          <td><div className="row-actions">
            <button aria-label={'Sửa ' + account.displayName} onClick={() => setEditor({ account })}>Sửa</button>
            <button aria-label={(account.locked ? 'Mở khóa ' : 'Khóa ') + account.displayName} disabled={account.id === actor.id}
              onClick={() => { setLockError(''); setLocking(account) }}>{account.locked ? 'Mở khóa' : 'Khóa'}</button>
          </div></td>
        </tr>)}</tbody></table></div>
          <div className="pagination"><span>{data.totalElements} tài khoản · Trang {data.page + 1}/{Math.max(data.totalPages, 1)}</span>
            <div className="actions"><button disabled={data.page === 0} onClick={() => setFilters(value => ({ ...value, page: value.page - 1 }))}>Trang trước</button>
              <button disabled={data.page + 1 >= data.totalPages} onClick={() => setFilters(value => ({ ...value, page: value.page + 1 }))}>Trang sau</button></div></div></>}
    </section>
    {editor && <AccountEditor actor={actor} account={editor.account} onClose={() => setEditor(null)} onSaved={() => {
      setNotice(editor.account ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản. Người nhận có thể đăng nhập bằng mật khẩu ban đầu.')
      setEditor(null); refresh()
    }} />}
    {locking && <Modal title={locking.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'} busy={lockBusy} onClose={() => setLocking(null)}>
      <p>{locking.locked ? 'Cho phép đăng nhập lại tài khoản ' : 'Khóa tài khoản ' }<strong>{locking.email}</strong>?</p>
      {!locking.locked && <p className="muted">Các phiên đăng nhập hiện tại sẽ bị thu hồi ngay. Khi mở khóa, người dùng cần đăng nhập lại.</p>}
      {lockError && <p className="error" role="alert">{lockError}</p>}
      <div className="modal-actions"><button disabled={lockBusy} onClick={() => setLocking(null)}>Hủy</button>
        <button className={locking.locked ? 'primary' : 'danger'} disabled={lockBusy} onClick={() => { void confirmLock() }}>
          {lockBusy ? 'Đang xử lý…' : locking.locked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}</button></div>
    </Modal>}
  </main>
}
