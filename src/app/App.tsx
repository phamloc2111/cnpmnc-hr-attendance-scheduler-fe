import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import { ChangePasswordModal } from '../features/auth/ChangePasswordModal'
import { LoginPage } from '../features/auth/LoginPage'
import { homePaths } from '../features/auth/types'
import { AppShell } from './AppShell'
import { HomeIcon } from '../shared/components/HomeIcon'
import type { Role } from '../features/auth/types'
import { ApiError, clearSession, request } from '../shared/api/client'
import { AccountsPage } from '../features/accounts'
import { SchedulePage, EmployeeSchedulePage } from '../features/schedule'
import { AttendancePage, AttendanceResultsPage, EmployeeHome } from '../features/attendance'
import { WorkplacePage } from '../features/workplace'
import { RegistrationPage } from '../features/registration'
import { PositionsPage } from '../features/positions'

const routes: Record<string, { roles: Role[]; endpoint: string }> = {
  '/workplace': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/positions': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/schedules': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/attendance-results': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/attendance': { roles: ['MANAGER', 'ADMIN'], endpoint: '' },
  '/registrations': { roles: ['EMPLOYEE'], endpoint: '' },
  '/my-schedule': { roles: ['EMPLOYEE'], endpoint: '' },
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
  return <AppShell role={user.role} name={user.displayName} path={path} loggingOut={loggingOut}
    onChangePassword={() => { setPasswordNotice(''); setChangingPassword(true) }} onLogout={() => { void signOut() }}>
      {passwordNotice && <p className="notice workspace-notice" role="status">{passwordNotice}</p>}
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} onSaved={() => { setChangingPassword(false); setPasswordNotice('Đổi mật khẩu thành công.') }} />}
      {route?.roles.includes(user.role) ? (path === '/employee' ? <EmployeeHome name={user.displayName} email={user.email} onChangePassword={() => { setPasswordNotice(''); setChangingPassword(true) }} onLogout={() => { void signOut() }} loggingOut={loggingOut} /> : path === '/registrations' ? <RegistrationPage /> : path === '/workplace' ? <WorkplacePage /> : path === '/positions' ? <PositionsPage canManage={user.role === 'MANAGER'} /> : path === '/my-schedule' ? <EmployeeSchedulePage name={user.displayName} email={user.email} onChangePassword={() => { setPasswordNotice(''); setChangingPassword(true) }} onLogout={() => { void signOut() }} loggingOut={loggingOut} /> : path === '/schedules' ? <SchedulePage /> : path === '/attendance-results' ? <AttendanceResultsPage /> : path === '/attendance' ? <AttendancePage /> : path === '/accounts' || path === '/employees' ? <AccountsPage key={path} actor={user} /> : <Workspace key={path} endpoint={route.endpoint} name={user.displayName} />) : <main className="workspace"><div className="page-heading"><div><p className="eyebrow">{route ? '403 · KHÔNG ĐỦ QUYỀN' : '404 · KHÔNG TÌM THẤY'}</p><h1>{route ? 'Bạn không có quyền truy cập' : 'Trang không tồn tại'}</h1></div></div><a className="primary link-button" href={'#' + homePaths[user.role]}>Về trang của tôi</a></main>}
  </AppShell>
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
  return <main className="workspace"><div className="page-heading"><div><p className="eyebrow">{data.title}</p><h1>Xin chào, {name}.</h1><p className="muted">{data.description}</p></div></div>
    <section className="welcome-card"><span className="status-dot" /><h2>Không gian làm việc của bạn</h2><p>Truy cập nhanh các chức năng để quản lý đội ngũ và theo dõi lịch làm việc.</p></section>
    <section className="workspace-shortcuts" aria-label="Truy cập nhanh">
      <a className="workspace-shortcut" href={endpoint === 'administration' ? '#/accounts' : '#/employees'}><span><HomeIcon name="team" /></span><strong>{endpoint === 'administration' ? 'Tài khoản' : 'Nhân viên'}</strong><small>Thông tin và phân công đội ngũ</small></a>
      <a className="workspace-shortcut" href="#/schedules"><span><HomeIcon name="calendar" /></span><strong>Lịch làm việc</strong><small>Mẫu ca và phân ca theo tuần</small></a>
      <a className="workspace-shortcut" href="#/attendance-results"><span><HomeIcon name="check" /></span><strong>Phân loại ca làm</strong><small>Theo dõi kết quả vào và ra ca</small></a>
    </section>
  </main>
}
