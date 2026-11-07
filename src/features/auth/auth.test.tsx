import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { AuthProvider } from './AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { Role, User } from './types'

const future = () => new Date(Date.now() + 3600000).toISOString()
const userFor = (role: Role): User => ({ id: 'user-1', email: 'user@example.com', displayName: 'Nguyễn An', role })
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
function mount() { return render(<AuthProvider><App /></AuthProvider>) }
function fillLogin() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập →' }))
}
function mockApi(role: Role, override?: (path: string, init?: RequestInit) => Response | undefined) {
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url)
    const response = override?.(path, init)
    if (response) return response
    if (path.endsWith('/auth/login')) return json({ accessToken: 'test-token', expiresAt: future(), tokenType: 'Bearer', user: userFor(role) })
    if (path.endsWith('/auth/me')) return json(userFor(role))
    if (path.endsWith('/auth/logout')) return new Response(null, { status: 204 })
    if (path.endsWith('/auth/change-password')) return new Response(null, { status: 204 })
    return json({ title: 'Không gian làm việc', description: 'Chào mừng bạn' })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, value(this: HTMLDialogElement) { this.open = true },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, value(this: HTMLDialogElement) { this.open = false },
  })
})
beforeEach(() => { sessionStorage.clear(); window.location.hash = '/login'; vi.unstubAllGlobals() })

describe('SS-12 đăng nhập và đăng xuất', () => {
  it('đăng nhập và đăng xuất, xóa token, không gửi token vào login', async () => {
    const fetcher = mockApi('MANAGER')
    mount()
    await screen.findByLabelText('Email')
    fillLogin()
    await screen.findByText('Xin chào, Nguyễn An.')
    expect(window.location.hash).toBe('#/management')
    expect(sessionStorage.getItem('shiftsync.session')).toContain('test-token')
    const loginCall = fetcher.mock.calls.find(call => String(call[0]).endsWith('/auth/login'))
    expect(loginCall).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByLabelText('Email')
    expect(sessionStorage.getItem('shiftsync.session')).toBeNull()
    expect(window.location.hash).toBe('#/login')
  })
  it.each([
    [401, 'Email hoặc mật khẩu không đúng'],
    [403, 'Tài khoản đã bị khóa'],
  ])('hiển thị lỗi đăng nhập %s', async (status, message) => {
    mockApi('EMPLOYEE', path => path.endsWith('/auth/login') ? json({ message }, status) : undefined)
    mount()
    await screen.findByLabelText('Email')
    fillLogin()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(sessionStorage.getItem('shiftsync.session')).toBeNull()
    expect(screen.getByRole('button', { name: 'Đăng nhập →' })).toBeEnabled()
  })
  it('phiên hết hạn không được khôi phục', async () => {
    saveSession({ accessToken: 'old-token', expiresAt: new Date(Date.now() - 1000).toISOString() })
    const fetcher = mockApi('ADMIN')
    mount()
    await screen.findByLabelText('Email')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('lỗi mạng khi khôi phục phiên cho phép thử lại', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    const fetcher = mockApi('MANAGER')
    fetcher.mockRejectedValueOnce(new TypeError('offline'))
    mount()
    await screen.findByRole('heading', { name: 'Chưa thể kết nối' })
    expect(sessionStorage.getItem('shiftsync.session')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await screen.findByText('Xin chào, Nguyễn An.')
  })
  it('logout khi mất mạng vẫn xóa token và thông báo', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    const fetcher = mockApi('MANAGER')
    mount()
    await screen.findByText('Xin chào, Nguyễn An.')
    fetcher.mockRejectedValueOnce(new TypeError('offline'))
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByLabelText('Email')
    expect(sessionStorage.getItem('shiftsync.session')).toBeNull()
    expect(await screen.findByRole('status')).toHaveTextContent('Không thể xác nhận')
  })
})

describe('SS-13 phân quyền', () => {
  it.each<Role>(['EMPLOYEE', 'MANAGER', 'ADMIN'])('menu đúng role %s', async role => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    mockApi(role)
    mount()
    await screen.findByText('Xin chào, Nguyễn An.')
    expect(screen.queryByRole('link', { name: /Tài khoản/ }) !== null).toBe(role === 'ADMIN')
    expect(screen.queryByRole('button', { name: /Cài đặt/ }) !== null).toBe(role === 'ADMIN')
    expect(screen.queryByRole('button', { name: /Bảng công/ }) !== null).toBe(role !== 'EMPLOYEE')
    expect(screen.queryByRole('link', { name: /Lịch của tôi/ }) !== null).toBe(role === 'EMPLOYEE')
  })
  it('chặn nhân viên mở đường dẫn quản trị trực tiếp', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    const fetcher = mockApi('EMPLOYEE')
    window.location.hash = '/administration'
    mount()
    await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })
    expect(fetcher.mock.calls.some(call => String(call[0]).endsWith('/workspaces/administration'))).toBe(false)
  })
  it('API trả 401 thì xóa phiên và về đăng nhập', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    mockApi('MANAGER', path => path.includes('/workspaces/') ? json({ message: 'Phiên đã hết hạn' }, 401) : undefined)
    mount()
    await screen.findByLabelText('Email')
    expect(sessionStorage.getItem('shiftsync.session')).toBeNull()
  })
  it('API trả 403 giữ phiên và hiển thị thiếu quyền', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    mockApi('MANAGER', path => path.includes('/workspaces/') ? json({ message: 'Bạn không có quyền truy cập chức năng này' }, 403) : undefined)
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền')
    expect(sessionStorage.getItem('shiftsync.session')).not.toBeNull()
    await act(async () => { window.location.hash = '/administration'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    await waitFor(() => expect(screen.getByRole('heading')).toHaveTextContent('Bạn không có quyền truy cập'))
  })
})

describe('SS-14 đổi mật khẩu', () => {
  it('nhập đúng mật khẩu cũ và mật khẩu mới từ 8 ký tự, bấm Lưu thì đổi thành công', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    const fetcher = mockApi('EMPLOYEE')
    mount()
    await screen.findByText('Xin chào, Nguyễn An.')
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đổi mật khẩu' })
    const currentInput = within(dialog).getByLabelText('Mật khẩu cũ') as HTMLInputElement
    const newInput = within(dialog).getByLabelText('Mật khẩu mới') as HTMLInputElement
    expect(currentInput.type).toBe('password')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hiện mật khẩu cũ' }))
    expect(currentInput.type).toBe('text')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ẩn mật khẩu cũ' }))
    expect(currentInput.type).toBe('password')

    fireEvent.change(currentInput, { target: { value: 'OldPass123!' } })
    fireEvent.change(newInput, { target: { value: 'NewPass8' } })
    fireEvent.change(within(dialog).getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'NewPass8' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Đổi mật khẩu thành công.')
    expect(screen.queryByRole('dialog', { name: 'Đổi mật khẩu' })).toBeNull()
    const changeCall = fetcher.mock.calls.find(call => String(call[0]).endsWith('/auth/change-password'))
    expect(changeCall).toBeDefined()
    expect(JSON.parse(String((changeCall?.[1] as RequestInit | undefined)?.body))).toEqual({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass8',
    })
  })

  it('nhập mật khẩu cũ sai thì báo lỗi và không đóng form', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    mockApi('EMPLOYEE', path => path.endsWith('/auth/change-password')
      ? json({ code: 'INVALID_CURRENT_PASSWORD', message: 'Mật khẩu cũ không đúng' }, 400)
      : undefined)
    mount()
    await screen.findByText('Xin chào, Nguyễn An.')
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đổi mật khẩu' })
    fireEvent.change(within(dialog).getByLabelText('Mật khẩu cũ'), { target: { value: 'WrongOld!' } })
    fireEvent.change(within(dialog).getByLabelText('Mật khẩu mới'), { target: { value: 'NewPass8' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Mật khẩu cũ không đúng')
    expect(screen.getByRole('dialog', { name: 'Đổi mật khẩu' })).toBeInTheDocument()
    expect(sessionStorage.getItem('shiftsync.session')).not.toBeNull()
  })

  it('chặn mật khẩu mới dưới 8 ký tự trước khi gọi API', async () => {
    saveSession({ accessToken: 'test-token', expiresAt: future() })
    const fetcher = mockApi('EMPLOYEE')
    mount()
    await screen.findByText('Xin chào, Nguyễn An.')
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đổi mật khẩu' })
    fireEvent.change(within(dialog).getByLabelText('Mật khẩu cũ'), { target: { value: 'OldPass123!' } })
    fireEvent.change(within(dialog).getByLabelText('Mật khẩu mới'), { target: { value: 'Short7!' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Mật khẩu mới phải có ít nhất 8 ký tự')
    expect(fetcher.mock.calls.some(call => String(call[0]).endsWith('/auth/change-password'))).toBe(false)
  })
})
