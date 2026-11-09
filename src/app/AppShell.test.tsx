import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
const props = { role: 'MANAGER' as const, name: 'Nguyễn An', path: '/schedules', loggingOut: false, onChangePassword: vi.fn(), onLogout: vi.fn() }
it('opens and closes the mobile navigation with Escape and restores keyboard focus', async () => {
  render(<AppShell {...props}><main>Lịch</main></AppShell>)
  const user = userEvent.setup(), toggle = screen.getByRole('button', { name: 'Mở menu' })
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveFocus()
  expect(document.querySelector('.workspace-layout')).toHaveAttribute('inert')
  await user.keyboard('{Escape}')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(toggle).toHaveFocus()
  expect(document.querySelector('.workspace-layout')).not.toHaveAttribute('inert')
})
it('closes the menu on navigation and only exposes administration links to admins', async () => {
  const { rerender } = render(<AppShell {...props}><main>Lịch</main></AppShell>)
  const menu = within(screen.getByRole('navigation', { name: 'Menu chính' }))
  expect(menu.queryByRole('link', { name: 'Tài khoản' })).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Mở menu' }))
  await userEvent.setup().click(menu.getByRole('link', { name: 'Nhân viên' }))
  expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveAttribute('aria-expanded', 'false')
  rerender(<AppShell {...props} role="ADMIN"><main>Lịch</main></AppShell>)
  expect(menu.getByRole('link', { name: 'Tài khoản' })).toHaveAttribute('href', '#/accounts')
})
it('preserves employee screens without adding a second header or navigation', () => {
  render(<AppShell {...props} role="EMPLOYEE" path="/my-schedule"><main>Lịch của tôi</main></AppShell>)
  expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Đổi mật khẩu' })).not.toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveTextContent('Lịch của tôi')
})
