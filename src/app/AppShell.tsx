import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from '../features/auth/types'
import { homePaths, roleLabels } from '../features/auth/types'
import { HomeIcon } from '../shared/components/HomeIcon'
import type { HomeIconName } from '../shared/components/HomeIcon'

type NavigationItem = { path: string; label: string; icon: HomeIconName }
export function AppShell({ role, name, path, loggingOut, onChangePassword, onLogout, children }: {
  role: Role; name: string; path: string; loggingOut: boolean; onChangePassword: () => void; onLogout: () => void; children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const sidebar = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebar.current?.querySelector<HTMLButtonElement>('.shell-close-menu')?.focus()
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const controls = [...(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? [])].filter(element => element.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', trap)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', trap); toggle.current?.focus() }
  }, [menuOpen])
  useEffect(() => { setMenuOpen(false) }, [path])
  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 901px)')
    function closeOnDesktop() { if (desktop?.matches) setMenuOpen(false) }
    desktop?.addEventListener('change', closeOnDesktop)
    return () => desktop?.removeEventListener('change', closeOnDesktop)
  }, [])
  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  const employee = role === 'EMPLOYEE'
  const home = employee && ['/employee', '/my-schedule'].includes(path)
  const links: NavigationItem[] = [{ path: homePaths[role], label: 'Tổng quan', icon: 'dashboard' }]
  if (role === 'ADMIN') links.push({ path: '/management', label: 'Không gian quản lý', icon: 'team' })
  links.push(...(employee ? [
    { path: '/my-schedule', label: 'Lịch của tôi', icon: 'calendar' as const },
    { path: '/employee', label: 'Chấm công', icon: 'clock' as const },
  ] : [
    { path: '/employees', label: 'Nhân viên', icon: 'team' as const },
    { path: '/positions', label: 'Vị trí', icon: 'briefcase' as const },
    { path: '/workplace', label: 'Điểm làm việc', icon: 'pin' as const },
    { path: '/schedules', label: 'Lịch làm việc', icon: 'calendar' as const },
    { path: '/attendance', label: 'Bảng công', icon: 'clock' as const },
    { path: '/attendance-results', label: 'Phân loại ca làm', icon: 'check' as const },
  ]))
  const current = links.find(link => link.path === path)?.label ?? (path === '/accounts' ? 'Tài khoản' : 'Không gian làm việc')
  const initials = name.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toLocaleUpperCase('vi')
  function navLink(item: NavigationItem) {
    return <a key={item.path + item.label} href={'#' + item.path} className={path === item.path ? 'active' : ''} aria-current={path === item.path ? 'page' : undefined} onClick={() => setMenuOpen(false)}><HomeIcon name={item.icon} size={19} /><span>{item.label}</span>{path === item.path && <i aria-hidden="true" />}</a>
  }
  return <div className={'app-layout themed-app' + (employee ? ' employee-shell' + (home ? ' home-active' : '') : '') + (menuOpen ? ' is-menu-open' : '')}>
    {!home && <aside className="sidebar" ref={sidebar} id="workspace-navigation" aria-label="Điều hướng không gian làm việc">
      <div className="shell-brand-row"><a className="brand" href={'#' + homePaths[role]}><span className="brand-mark">S</span>ShiftSync</a><button className="shell-close-menu" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><HomeIcon name="close" /></button></div>
      <p className="nav-label">KHÔNG GIAN LÀM VIỆC</p><nav aria-label="Menu chính">{links.map(navLink)}
        {employee ? <button disabled><HomeIcon name="calendar" size={19} /><span>Lịch rảnh</span><small>Sắp có</small></button> : <button disabled><HomeIcon name="report" size={19} /><span>Báo cáo</span><small>Sắp có</small></button>}
        {role === 'ADMIN' && <><p className="nav-label">QUẢN TRỊ HỆ THỐNG</p>{navLink({ path: '/accounts', label: 'Tài khoản', icon: 'shield' })}<button disabled><HomeIcon name="settings" size={19} /><span>Cài đặt</span><small>Sắp có</small></button></>}
      </nav>
      <div className="sidebar-user"><span className="avatar">{initials}</span><div><strong>{name}</strong><small>{roleLabels[role]}</small></div></div>
    </aside>}
    {menuOpen && <button className="shell-menu-backdrop" aria-label="Đóng menu điều hướng" onClick={() => setMenuOpen(false)} />}
    <div className="workspace-layout" inert={menuOpen}>{!home && <header className="topbar"><div className="shell-current-page"><button ref={toggle} className="shell-open-menu" aria-label="Mở menu" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(value => !value)}><HomeIcon name="menu" /></button><div><small>KHÔNG GIAN LÀM VIỆC</small><strong>{current}</strong></div><span className="shell-role">{roleLabels[role]}</span></div>
      <div className="topbar-actions"><button aria-label="Đổi mật khẩu" onClick={onChangePassword}><HomeIcon name="key" size={16} /><span>Đổi mật khẩu</span></button><button aria-label={loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'} disabled={loggingOut} onClick={onLogout}><HomeIcon name="logout" size={16} /><span>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span></button></div>
    </header>}{children}</div>
  </div>
}
