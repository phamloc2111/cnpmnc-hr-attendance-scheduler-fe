import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal'
import { LoginPage } from '../features/auth/LoginPage'
import { homePaths, roleLabels } from '../features/auth/types'
import type { Role } from '../features/auth/types'
import { ApiError, clearSession, request } from '../shared/api/client'
import { AccountsPage } from '../features/accounts'
import { SchedulePage } from '../features/schedule'
import { PositionsPage } from '../features/positions'
import { AttendancePage } from '../features/attendance/AttendancePage'
import { AttendanceResultsPage } from '../features/attendance/AttendanceResultsPage'

const routes: Record<string, { roles: Role[]; endpoint: string }> = {
  '/positions': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/schedules': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/my-schedule': { roles: ['EMPLOYEE'], endpoint: '' },
  '/attendance': { roles: ['EMPLOYEE'], endpoint: '' },
  '/attendance-results': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/accounts': { roles: ['ADMIN'], endpoint: '' },
  '/employees': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/employee': { roles: ['EMPLOYEE'], endpoint: 'employee' },
  '/management': { roles: ['MANAGER', 'ADMIN'], endpoint: 'management' },
  '/administration': { roles: ['ADMIN'], endpoint: 'administration' },
}
function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
export function App() {
  const path = useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || '/')
  const { user, loading, restoreError, retry, logout } = useAuth()
  const [notice, setNotice] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  useEffect(() => {
    if (loading || restoreError) return
    if (!user) window.location.hash = '/login'
    else if (path === '/login' || path === '/') window.location.hash = homePaths[user.role]
  }, [user, loading, restoreError, path])
  async function signOut() {
    setLoggingOut(true)
    setChangingPassword(false)
    setPasswordNotice('')
    try { await logout(); setNotice('Bạn đã đăng xuất.') }
    catch (error: unknown) { setNotice(error instanceof ApiError && error.status === 401 ? 'Phiên đăng nhập đã kết thúc.' : 'Đã xóa phiên trên trình duyệt. Không thể xác nhận thu hồi phiên trên máy chủ; phiên sẽ hết hạn theo thời gian quy định.') }
    finally { window.location.hash = '/login'; setLoggingOut(false) }
  }
  if (loading) return <main className="center-state" role="status">Đang xác minh phiên đăng nhập…</main>
  if (restoreError) return <main className="center-state"><h1>Chưa thể kết nối</h1><p role="alert">{restoreError}</p><div className="actions"><button className="primary" onClick={retry}>Thử lại</button><button onClick={clearSession}>Về đăng nhập</button></div></main>
  if (!user) return <LoginPage notice={notice} />
  const route = routes[path]
  return <div className="app-layout"><aside className="sidebar"><a className="brand" href={'#' + homePaths[user.role]}><span className="brand-mark">S</span> ShiftSync</a><p className="nav-label">KHÔNG GIAN LÀM VIỆC</p>
    <nav aria-label="Menu chính"><a className={path === homePaths[user.role] ? 'active' : ''} href={'#' + homePaths[user.role]}>Tổng quan</a>
      {user.role === 'ADMIN' && <a className={path === '/management' ? 'active' : ''} href="#/management">Không gian quản lý</a>}
      {(user.role === 'MANAGER' || user.role === 'ADMIN') && <><a className={path === '/employees' ? 'active' : ''} href="#/employees">Nhân viên</a><a className={path === '/positions' ? 'active' : ''} href="#/positions">Vị trí</a><a className={path === '/schedules' ? 'active' : ''} href="#/schedules">Lịch làm việc</a><a className={path === '/attendance-results' ? 'active' : ''} href="#/attendance-results">Bảng công</a><button disabled>Báo cáo <small>Sắp có</small></button></>}
      {user.role === 'EMPLOYEE' && <><a className={path === '/my-schedule' ? 'active' : ''} href="#/my-schedule">Lịch của tôi</a><a className={path === '/attendance' ? 'active' : ''} href="#/attendance">Chấm công</a><button disabled>Lịch rảnh <small>Sắp có</small></button></>}
      {user.role === 'ADMIN' && <><p className="nav-label">QUẢN TRỊ HỆ THỐNG</p><a className={path === '/accounts' ? 'active' : ''} href="#/accounts">Tài khoản</a><button disabled>Cài đặt <small>Sắp có</small></button></>}
    </nav><div className="sidebar-user"><span className="avatar">{user.displayName.slice(0, 1)}</span><div><strong>{user.displayName}</strong><small>{roleLabels[user.role]}</small></div></div></aside>
    <div className="workspace-layout"><header className="topbar"><span>{roleLabels[user.role]}</span><div className="topbar-actions"><button type="button" onClick={() => { setPasswordNotice(''); setChangingPassword(true) }}>Đổi mật khẩu</button><button onClick={() => { void signOut() }} disabled={loggingOut}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div></header>
      {passwordNotice && <p className="notice workspace-notice" role="status">{passwordNotice}</p>}
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} onSaved={() => { setChangingPassword(false); setPasswordNotice('Đổi mật khẩu thành công.') }} />}
      {route?.roles.includes(user.role) ? (path === '/positions' ? <PositionsPage canManage={user.role === 'MANAGER'} /> : path === '/schedules' || path === '/my-schedule' ? <SchedulePage employee={user.role === 'EMPLOYEE'} /> : path === '/attendance' ? <AttendancePage /> : path === '/attendance-results' ? <AttendanceResultsPage /> : path === '/accounts' || path === '/employees' ? <AccountsPage key={path} actor={user} /> : <Workspace key={path} endpoint={route.endpoint} name={user.displayName} />) : <main className="workspace"><p className="eyebrow">{route ? '403 · KHÔNG ĐỦ QUYỀN' : '404 · KHÔNG TÌM THẤY'}</p><h1>{route ? 'Bạn không có quyền truy cập' : 'Trang không tồn tại'}</h1><a className="primary link-button" href={'#' + homePaths[user.role]}>Về trang của tôi</a></main>}
    </div></div>
}
function Workspace({ endpoint, name }: { endpoint: string; name: string }) {
  const [data, setData] = useState<{ title: string; description: string } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    request<{ title: string; description: string }>('/workspaces/' + endpoint)
      .then(value => { if (active) setData(value) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không thể tải dữ liệu.')})
    return () => { active = false }
  }, [endpoint, attempt])
  if (error) return <main className="workspace"><p className="error" role="alert">{error}</p><button onClick={() => setAttempt(value => value + 1)}>Thử lại</button></main>
  if (!data) return <main className="workspace" role="status">Đang tải không gian làm việc…</main>
  return <main className="workspace"><p className="eyebrow">{data.title}</p><h1>Xin chào, {name}.</h1><p className="muted">{data.description}</p><section className="welcome-card"><span className="status-dot" /><h2>Bạn đã sẵn sàng</h2><p>Đăng nhập thành công. Các chức năng chấm công và xếp lịch sẽ xuất hiện tại đây khi được triển khai.</p></section></main>
}
