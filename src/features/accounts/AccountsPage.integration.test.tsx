import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { Account } from './types'
import type { Role } from '../auth'

const adminId = '00000000-0000-0000-0000-000000000001'
const managerId = '00000000-0000-0000-0000-000000000002'
const employeeId = '00000000-0000-0000-0000-000000000003'
const endpoint = 'http://localhost:8080/api/v1/accounts'
const baseEmployee: Account = {
  id: employeeId, email: 'an@example.com', displayName: 'Nguyễn An', role: 'EMPLOYEE',
  locked: false, position: 'Thu ngân', skills: ['Thu ngân'], managerId, version: 0,
}
const baseManager: Account = {
  id: managerId, email: 'manager@example.com', displayName: 'Quản lý A', role: 'MANAGER',
  locked: false, position: null, skills: [], managerId: null, version: 0,
}
let rows: Account[] = []
let actorRole: Role = 'ADMIN'
let sentBodies: Record<string, unknown>[] = []

function page(items: Account[], index = 0, total = items.length) {
  return { items, page: index, size: 20, totalElements: total, totalPages: Math.ceil(total / 20) }
}
const handlers = [
  http.get('http://localhost:8080/api/v1/auth/me', () => HttpResponse.json({
    id: actorRole === 'ADMIN' ? adminId : managerId,
    email: 'actor@example.com', displayName: 'Người quản lý', role: actorRole,
  })),
  http.get(endpoint, ({ request }) => {
    const query = new URL(request.url).searchParams
    let items = rows.filter(row => actorRole === 'ADMIN' || row.role === 'EMPLOYEE')
    if (query.get('role')) items = items.filter(row => row.role === query.get('role'))
    if (query.get('locked')) items = items.filter(row => String(row.locked) === query.get('locked'))
    if (query.get('q')) items = items.filter(row =>
      (row.displayName + row.email).toLowerCase().includes(query.get('q')!.toLowerCase()))
    return HttpResponse.json(page(items))
  }),
  http.get(endpoint + '/:id', ({ params }) => {
    const account = rows.find(row => row.id === params.id)
    return account ? HttpResponse.json(account) : HttpResponse.json({ message: 'Không tìm thấy' }, { status: 404 })
  }),
  http.post(endpoint, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    sentBodies.push(body)
    const created: Account = {
      id: 'new-account', email: body.email as string, displayName: body.displayName as string,
      role: body.role as Role, locked: false, position: body.position as string | null,
      skills: body.skills as string[], managerId: body.managerId as string | null, version: 0,
    }
    rows = [...rows, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put(endpoint + '/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>
    sentBodies.push(body)
    const current = rows.find(row => row.id === params.id)!
    const updated = { ...current, ...body, version: current.version + 1 } as Account
    rows = rows.map(row => row.id === params.id ? updated : row)
    return HttpResponse.json(updated)
  }),
  http.patch(endpoint + '/:id/lock', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>
    sentBodies.push(body)
    rows = rows.map(row => row.id === params.id
      ? { ...row, locked: body.locked as boolean, version: row.version + 1 } : row)
    return HttpResponse.json(rows.find(row => row.id === params.id))
  }),
]
const server = setupServer(...handlers)
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, value(this: HTMLDialogElement) { this.open = true },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, value(this: HTMLDialogElement) { this.open = false },
  })
})
beforeEach(() => {
  vi.unstubAllGlobals()
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-05T03:00:00Z'))
  rows = [structuredClone(baseEmployee), structuredClone(baseManager)]
  sentBodies = []
  actorRole = 'ADMIN'
  sessionStorage.clear()
  saveSession({ accessToken: 'test-token', expiresAt: '2026-11-05T04:00:00Z' })
  window.location.hash = '/accounts'
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
function mount() { render(<AuthProvider><App /></AuthProvider>) }
async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Tạo tài khoản' }))
  return screen.getByRole('dialog', { name: 'Tạo tài khoản' })
}
async function fillCreate(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText('Họ tên'), 'Trần Bình')
  await user.type(within(dialog).getByLabelText('Email'), 'binh@example.com')
  await user.type(within(dialog).getByLabelText('Mật khẩu ban đầu'), 'Password-12345!')
}

describe('SS-15 quản lý tài khoản', () => {
  it('hiện loading rồi hiển thị dữ liệu từ API', async () => {
    let release!: () => void
    const ready = new Promise<void>(resolve => { release = resolve })
    server.use(http.get(endpoint, async () => { await ready; return HttpResponse.json(page(rows)) }))
    mount()
    expect(await screen.findByText('Đang tải danh sách…')).toBeInTheDocument()
    release()
    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.getByText('an@example.com')).toBeInTheDocument()
  })
  it('hiện trạng thái rỗng', async () => {
    rows = []
    mount()
    expect(await screen.findByText('Chưa có tài khoản phù hợp')).toBeInTheDocument()
  })
  it('lỗi tải danh sách cho phép thử lại', async () => {
    const user = userEvent.setup()
    server.use(http.get(endpoint, () => HttpResponse.json({ message: 'Máy chủ đang bận' }, { status: 503 })))
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận')
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
  })
  it('tạo nhân viên với vị trí, kỹ năng và quản lý qua API thật của client', async () => {
    const user = userEvent.setup()
    mount()
    const dialog = await openCreate(user)
    await fillCreate(user, dialog)
    await user.type(within(dialog).getByLabelText('Vị trí'), 'Pha chế')
    await user.type(within(dialog).getByLabelText('Kỹ năng'), 'Pha chế, Phục vụ')
    expect(within(dialog).queryByLabelText('Tìm người quản lý')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('combobox', { name: 'Người quản lý' }))
    await user.click(await within(dialog).findByRole('option', { name: /Quản lý A/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await screen.findByText('Trần Bình')).toBeInTheDocument()
    expect(sentBodies[0]).toMatchObject({
      email: 'binh@example.com', role: 'EMPLOYEE', managerId,
      position: 'Pha chế', skills: ['Pha chế', 'Phục vụ'], password: 'Password-12345!',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('tìm và chọn quản lý bằng bàn phím trong cùng một ô', async () => {
    const user = userEvent.setup()
    mount()
    const dialog = await openCreate(user)
    const combo = within(dialog).getByRole('combobox', { name: 'Người quản lý' })
    await user.click(combo)
    await user.type(combo, 'manager@')
    await within(dialog).findByRole('option', { name: /Quản lý A/ })
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(combo).toHaveValue('Quản lý A · manager@example.com')
    expect(within(dialog).queryByRole('listbox')).not.toBeInTheDocument()
    await fillCreate(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))
    await screen.findByText('Trần Bình')
    expect(sentBodies[0]).toMatchObject({ managerId })
  })
  it('sửa nhân viên hiện tên quản lý và không đổi phân công khi chỉ gõ tìm', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Sửa Nguyễn An' }))
    const dialog = screen.getByRole('dialog')
    const combo = within(dialog).getByRole('combobox', { name: 'Người quản lý' })
    await waitFor(() => expect(combo).toHaveValue('Quản lý A · manager@example.com'))
    await user.click(combo)
    await user.type(combo, 'không tồn tại')
    await within(dialog).findByText('Không tìm thấy quản lý phù hợp.')
    await user.click(within(dialog).getByLabelText('Họ tên'))
    expect(combo).toHaveValue('Quản lý A · manager@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(sentBodies[0]).toMatchObject({ managerId })
  })
  it('bỏ phân công bằng một lựa chọn trong danh sách', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Sửa Nguyễn An' }))
    const dialog = screen.getByRole('dialog')
    const combo = within(dialog).getByRole('combobox', { name: 'Người quản lý' })
    await waitFor(() => expect(combo).toHaveValue('Quản lý A · manager@example.com'))
    await user.click(combo)
    await user.click(within(dialog).getByRole('option', { name: 'Chưa phân công' }))
    expect(combo).toHaveValue('Chưa phân công')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(sentBodies[0]).toMatchObject({ managerId: null })
  })
  it.each<Role>(['MANAGER', 'ADMIN'])('tạo %s chỉ có trường tài khoản và không gửi thông tin xếp ca', async role => {
    const user = userEvent.setup()
    mount()
    const dialog = await openCreate(user)
    await fillCreate(user, dialog)
    await user.type(within(dialog).getByLabelText('Vị trí'), 'Thu ngân')
    await user.type(within(dialog).getByLabelText('Kỹ năng'), 'Pha chế')
    await user.selectOptions(within(dialog).getByLabelText('Vai trò'), role)
    expect(within(dialog).queryByLabelText('Vị trí')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Kỹ năng')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Người quản lý')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))
    await screen.findByText('Trần Bình')
    expect(sentBodies[0]).toMatchObject({ role, position: null, skills: [], managerId: null })
  })
  it('sửa quản lý không hiện thông tin xếp ca, đổi sang nhân viên mới hiện', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Sửa Quản lý A' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByLabelText('Vị trí')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Kỹ năng')).not.toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Vai trò'), 'EMPLOYEE')
    expect(within(dialog).getByLabelText('Vị trí')).toHaveValue('')
    expect(within(dialog).getByLabelText('Kỹ năng')).toHaveValue('')
    expect(within(dialog).getByLabelText('Người quản lý')).toBeInTheDocument()
  })
  it('email bị trùng giữ form và hiện lỗi từ server', async () => {
    const user = userEvent.setup()
    server.use(http.post(endpoint, () => HttpResponse.json({ message: 'Email đã được sử dụng' }, { status: 409 })))
    mount()
    const dialog = await openCreate(user)
    await fillCreate(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Email đã được sử dụng')
    expect(within(dialog).getByLabelText('Email')).toHaveValue('binh@example.com')
  })
  it('sửa thông tin gửi version và không gửi mật khẩu', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Sửa Nguyễn An' }))
    const dialog = screen.getByRole('dialog', { name: 'Sửa tài khoản' })
    await user.clear(within(dialog).getByLabelText('Họ tên'))
    await user.type(within(dialog).getByLabelText('Họ tên'), 'Nguyễn An mới')
    await user.clear(within(dialog).getByLabelText('Kỹ năng'))
    await user.type(within(dialog).getByLabelText('Kỹ năng'), 'Phục vụ')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await screen.findByText('Nguyễn An mới')).toBeInTheDocument()
    expect(sentBodies[0]).toMatchObject({ version: 0, skills: ['Phục vụ'] })
    expect(sentBodies[0]).not.toHaveProperty('password')
  })
  it('khóa cần xác nhận, sau đó có thể mở khóa', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'Khóa Nguyễn An' }))
    let dialog = screen.getByRole('dialog', { name: 'Khóa tài khoản' })
    expect(sentBodies).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(sentBodies).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Khóa Nguyễn An' }))
    dialog = screen.getByRole('dialog', { name: 'Khóa tài khoản' })
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận khóa' }))
    expect(await screen.findByRole('button', { name: 'Mở khóa Nguyễn An' })).toBeInTheDocument()
    expect(sentBodies[0]).toEqual({ locked: true, version: 0 })
    await user.click(screen.getByRole('button', { name: 'Mở khóa Nguyễn An' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận mở khóa' }))
    expect(await screen.findByRole('button', { name: 'Khóa Nguyễn An' })).toBeInTheDocument()
    expect(sentBodies[1]).toEqual({ locked: false, version: 1 })
  })
  it('quản lý không thấy lựa chọn cấp role hay chuyển người quản lý', async () => {
    actorRole = 'MANAGER'
    window.location.hash = '/employees'
    const user = userEvent.setup()
    mount()
    const dialog = await openCreate(user)
    expect(within(dialog).queryByLabelText('Vai trò')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Người quản lý')).not.toBeInTheDocument()
    await fillCreate(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))
    await screen.findByText('Trần Bình')
    expect(sentBodies[0]).toMatchObject({ role: 'EMPLOYEE', managerId: null })
  })
  it('lỗi 403 khi ghi dữ liệu giữ nguyên phiên và hiển thị lỗi', async () => {
    const user = userEvent.setup()
    server.use(http.patch(endpoint + '/:id/lock', () => HttpResponse.json({ message: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 })))
    mount()
    await user.click(await screen.findByRole('button', { name: 'Khóa Nguyễn An' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận khóa' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Bạn không có quyền')
    expect(sessionStorage.getItem('shiftsync.session')).not.toBeNull()
  })
  it('lỗi 401 khi ghi dữ liệu xóa phiên và về đăng nhập', async () => {
    const user = userEvent.setup()
    server.use(http.patch(endpoint + '/:id/lock', () => HttpResponse.json({ message: 'Phiên hết hạn' }, { status: 401 })))
    mount()
    await user.click(await screen.findByRole('button', { name: 'Khóa Nguyễn An' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận khóa' }))
    expect(await screen.findByLabelText('Mật khẩu')).toBeInTheDocument()
    expect(sessionStorage.getItem('shiftsync.session')).toBeNull()
  })
  it('lọc và tìm kiếm gửi đúng tham số tới server', async () => {
    const requests: URL[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.url.startsWith(endpoint)) requests.push(new URL(request.url))
    })
    const user = userEvent.setup()
    mount()
    await screen.findByText('Nguyễn An')
    await user.selectOptions(screen.getByLabelText('Vai trò'), 'EMPLOYEE')
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('role')).toBe('EMPLOYEE'))
    await user.type(screen.getByLabelText('Tìm tài khoản'), 'an@example.com')
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('q')).toBe('an@example.com'))
    server.events.removeAllListeners('request:start')
  })
  it('phân trang gọi API với page kế tiếp', async () => {
    server.use(http.get(endpoint, ({ request }) => {
      const index = Number(new URL(request.url).searchParams.get('page'))
      return HttpResponse.json(page([index === 0 ? baseEmployee : baseManager], index, 21))
    }))
    const user = userEvent.setup()
    mount()
    await screen.findByText('Nguyễn An')
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(await screen.findByText('Quản lý A')).toBeInTheDocument()
    expect(screen.getByText(/Trang 2\/2/)).toBeInTheDocument()
  })
})
