import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { RegistrationManagementPage } from './RegistrationManagementPage'
import { RegistrationPage } from './RegistrationPage'
import { canEdit } from './api'
import type { RegistrationWeek } from './api'
import type { ManagedEmployee, ManagedWeek } from './management-api'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'

const base = 'http://localhost:8080/api/v1'
let data: ManagedWeek
let role: 'MANAGER' | 'EMPLOYEE' | 'ADMIN'
let writes: { employeeId: string; weekStart: string; reopened: boolean; accessRevision: string }[]
let reads: URLSearchParams[]
const employee = (id: string, name: string): ManagedEmployee => ({ employeeId: id, displayName: name, accountLocked: false, selectionCount: 2, state: 'CLOSED', reopenedAt: null, accessRevision: 'closed', canReopen: true, canClose: false })
const server = setupServer(
  http.get(base + '/registrations/management', ({ request }) => { reads.push(new URL(request.url).searchParams); return HttpResponse.json(data) }),
  http.put(base + '/registrations/management/:employeeId/access', async ({ request, params }) => {
    const body = await request.json() as { weekStart: string; reopened: boolean; accessRevision: string }
    const id = String(params.employeeId); writes.push({ employeeId: id, ...body })
    const person = data.items.find(item => item.employeeId === id)!
    const updated: ManagedEmployee = { ...person, state: body.reopened ? 'REOPENED' : 'CLOSED', canReopen: !body.reopened, canClose: body.reopened, accessRevision: body.reopened ? 'grant-new' : 'closed', reopenedAt: body.reopened ? '2026-11-16T03:00:00Z' : null }
    data = { ...data, items: data.items.map(item => item.employeeId === id ? updated : item) }; return HttpResponse.json(updated)
  }),
  http.get(base + '/auth/me', () => HttpResponse.json({ id: 'manager', role, displayName: 'Quản lý', email: 'manager@example.com' })),
)
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
  server.listen({ onUnhandledFrame: 'error' })
})
beforeEach(() => {
  writes = []; reads = []; role = 'MANAGER'
  data = { weekStart: '2026-11-16', weekEnd: '2026-11-22', serverNow: '2026-11-16T03:00:00Z', opensAt: '2026-11-14T17:00:00Z', closesAt: '2026-11-15T17:00:00Z', page: 0, size: 20, totalElements: 2, totalPages: 1, items: [employee('a', 'An'), employee('b', 'Bảo')] }
})
afterEach(() => { server.resetHandlers(); sessionStorage.clear(); window.location.hash = '' })
afterAll(() => server.close())

it('opens only the confirmed employee and selected week, then can close without deleting selections', async () => {
  const user = userEvent.setup(); render(<RegistrationManagementPage />)
  await user.click(await screen.findByRole('button', { name: 'Mở lại đăng ký cho An' }))
  expect(writes).toHaveLength(0)
  expect(screen.getByRole('dialog')).toHaveTextContent('16/11/2026 – 22/11/2026')
  await user.click(screen.getByRole('button', { name: 'Xác nhận mở lại' }))
  expect(await screen.findByText(/Đã mở lại đăng ký cho An/)).toBeInTheDocument()
  expect(writes).toEqual([{ employeeId: 'a', weekStart: '2026-11-16', reopened: true, accessRevision: 'closed' }])
  const close = await screen.findByRole('button', { name: 'Khóa lại đăng ký của An' })
  expect(screen.getByRole('button', { name: 'Mở lại đăng ký cho Bảo' })).toBeEnabled()
  await user.click(close); await user.click(screen.getByRole('button', { name: 'Xác nhận khóa lại' }))
  expect(await screen.findByText(/Đã khóa lại đăng ký của An/)).toBeInTheDocument()
  expect(writes[1]).toEqual({ employeeId: 'a', weekStart: '2026-11-16', reopened: false, accessRevision: 'grant-new' })
  await screen.findByRole('button', { name: 'Mở lại đăng ký cho An' })
  expect(data.items[0].selectionCount).toBe(2)
})
it('does not send a mutation when confirmation is cancelled', async () => {
  const user = userEvent.setup(); render(<RegistrationManagementPage />)
  await user.click(await screen.findByRole('button', { name: 'Mở lại đăng ký cho An' }))
  await user.click(screen.getByRole('button', { name: 'Hủy' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(writes).toHaveLength(0)
})
it('does not offer reopen controls before closure or for locked accounts', async () => {
  data.items = [{ ...employee('a', 'An'), state: 'OPEN', canReopen: false }, { ...employee('b', 'Bảo'), state: 'ACCOUNT_LOCKED', accountLocked: true, canReopen: false }, { ...employee('c', 'Chi'), state: 'NOT_OPEN', canReopen: false }]
  render(<RegistrationManagementPage />)
  expect(await screen.findByText('Đang mở tự động')).toBeInTheDocument()
  expect(screen.getByText('Tài khoản bị khóa')).toBeInTheDocument()
  expect(screen.getByText('Chưa đến giờ mở')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Mở lại đăng ký/ })).not.toBeInTheDocument()
})
it('requires reload after a stale-access conflict instead of overwriting the new state', async () => {
  server.use(http.put(base + '/registrations/management/:employeeId/access', () => HttpResponse.json({ message: 'Quyền đăng ký vừa thay đổi. Hãy tải lại.' }, { status: 409 })))
  const user = userEvent.setup(); render(<RegistrationManagementPage />)
  await user.click(await screen.findByRole('button', { name: 'Mở lại đăng ký cho An' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận mở lại' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Hãy tải lại')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Xác nhận mở lại' })).not.toBeInTheDocument()
  data.items[0] = { ...data.items[0], state: 'REOPENED', canReopen: false, canClose: true, accessRevision: 'foreign-grant' }
  await user.click(screen.getByRole('button', { name: 'Tải lại dữ liệu' }))
  expect(await screen.findByRole('button', { name: 'Khóa lại đăng ký của An' })).toBeInTheDocument()
})
it('uses server pagination, explicit search and Monday weeks in API parameters', async () => {
  data.totalPages = 2; data.totalElements = 21
  const user = userEvent.setup(); render(<RegistrationManagementPage />)
  await user.click(await screen.findByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(reads.at(-1)?.get('page')).toBe('1'))
  fireEvent.change(screen.getByLabelText('Tìm nhân viên'), { target: { value: 'An & Bảo' } })
  await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  await waitFor(() => expect(reads.at(-1)?.get('q')).toBe('An & Bảo'))
  expect(reads.at(-1)?.get('page')).toBe('0'); expect(reads.at(-1)?.get('size')).toBe('20')
  fireEvent.change(screen.getByLabelText('Tuần đăng ký'), { target: { value: '2026-11-19' } })
  await waitFor(() => expect(reads.at(-1)?.get('weekStart')).toBe('2026-11-16'))
})
it('shows an empty managed-team state', async () => {
  data.items = []; data.totalElements = 0; data.totalPages = 0
  render(<RegistrationManagementPage />)
  expect(await screen.findByRole('heading', { name: 'Chưa có nhân viên phù hợp' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('retries a failed managed-team read', async () => {
  let fail = true
  server.use(http.get(base + '/registrations/management', () => fail ? HttpResponse.json({ message: 'Không thể kết nối' }, { status: 503 }) : HttpResponse.json(data)))
  const user = userEvent.setup(); render(<RegistrationManagementPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối')
  fail = false; await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('button', { name: 'Mở lại đăng ký cho An' })).toBeEnabled()
})
it.each(['MANAGER', 'ADMIN', 'EMPLOYEE'] as const)('restricts registration management to the manager role (%s)', async actor => {
  role = actor; window.location.hash = '/registrations-management'
  saveSession({ accessToken: 'test-token', expiresAt: new Date(Date.now() + 3600000).toISOString() })
  render(<AuthProvider><App /></AuthProvider>)
  if (actor === 'MANAGER') {
    expect(await screen.findByRole('heading', { name: 'Quản lý đăng ký ca' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Menu chính' })).getByRole('link', { name: 'Đăng ký ca' })).toHaveAttribute('href', '#/registrations-management')
  } else {
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(reads).toHaveLength(0)
  }
})
it('permits an individually reopened employee after the normal deadline and preserves drafts if a manager relocks', async () => {
  const shift = { id: 'morning', name: 'Ca sáng', startTime: '08:00:00', endTime: '12:00:00', breakMinutes: 30, workingMinutes: 210, overnight: false, requiredPosition: null }
  const week: RegistrationWeek = { weekStart: data.weekStart, weekEnd: data.weekEnd, serverNow: data.serverNow, opensAt: data.opensAt, closesAt: data.closesAt, editable: true, reopened: true, revision: 'a'.repeat(64), shifts: [] }
  server.use(
    http.get(base + '/registrations/me', () => HttpResponse.json(week)),
    http.get(base + '/registrations/shifts', () => HttpResponse.json({ items: [shift], page: 0, size: 20, totalPages: 1, totalElements: 1 })),
    http.put(base + '/registrations/me', () => HttpResponse.json({ message: 'Quản lý đã khóa lại đăng ký.' }, { status: 409 })),
  )
  const user = userEvent.setup(); render(<RegistrationPage />)
  expect(await screen.findByText('Quản lý đã mở lại đăng ký')).toBeInTheDocument()
  await user.click(await screen.findByRole('checkbox', { name: 'Đăng ký Ca sáng' }))
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Lưu đăng ký' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('đã khóa lại')
  expect(screen.getByRole('checkbox', { name: 'Đăng ký Ca sáng' })).toBeChecked()
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeDisabled()
  expect(canEdit(week, 86400000)).toBe(true)
  expect(canEdit({ ...week, editable: false }, 0)).toBe(false)
  expect(canEdit({ ...week, reopened: false }, 0)).toBe(false)
})
