import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { Role } from '../auth'
import type { Position } from './api'
const base = 'http://localhost:8080/api/v1'
let role: Role = 'MANAGER'
let rows: Position[] = []
let sent: Record<string, unknown>[] = []
let queries: URLSearchParams[] = []
function page(items: Position[], index = 0, pages = 1) { return { items, page: index, size: 20, totalElements: items.length, totalPages: pages } }
const server = setupServer(
  http.get(base + '/auth/me', () => HttpResponse.json({ id: 'actor', email: 'manager@example.com', displayName: 'Quản lý', role })),
  http.get(base + '/positions', ({ request }) => {
    const q = new URL(request.url).searchParams; queries.push(q)
    const items = rows.filter(row => (!q.get('active') || String(row.active) === q.get('active')) && row.name.toLowerCase().includes((q.get('q') ?? '').toLowerCase()))
    return HttpResponse.json(page(items))
  }),
  http.post(base + '/positions', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>; sent.push(body)
    const created: Position = { id: 'new-position', name: body.name as string, active: true, version: 0 }; rows.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),
  http.patch(base + '/positions/:id/status', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>; sent.push(body)
    rows = rows.map(row => row.id === params.id ? { ...row, active: body.active as boolean, version: row.version + 1 } : row)
    return HttpResponse.json(rows.find(row => row.id === params.id))
  }),
)
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
})
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-05T03:00:00Z'))
  role = 'MANAGER'; rows = [{ id: 'cashier', name: 'Thu ngân', active: true, version: 0 }]; sent = []; queries = []
  sessionStorage.clear(); saveSession({ accessToken: 'test-token', expiresAt: '2026-11-05T04:00:00Z' })
  window.location.hash = '/positions'
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
const mount = () => render(<AuthProvider><App /></AuthProvider>)
it('manager creates a shared position and sees it in the list', async () => {
  mount(); const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Tên vị trí'), 'Pha chế')
  await user.click(screen.getByRole('button', { name: 'Tạo vị trí' }))
  expect(await screen.findByText('Đã tạo vị trí dùng chung.')).toBeInTheDocument()
  expect(sent).toEqual([{ name: 'Pha chế' }])
  expect(await screen.findByText('Pha chế')).toBeInTheDocument()
})
it('admin reads the catalog without creation or status actions', async () => {
  role = 'ADMIN'; mount()
  expect(await screen.findByText('Thu ngân')).toBeInTheDocument()
  expect(screen.queryByLabelText('Tên vị trí')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ngừng sử dụng Thu ngân' })).not.toBeInTheDocument()
})
it('employee cannot open the catalog route', async () => {
  role = 'EMPLOYEE'; mount()
  expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
  expect(queries).toHaveLength(0)
})
it('shows a duplicate name error without clearing the form', async () => {
  server.use(http.post(base + '/positions', () => HttpResponse.json({ message: 'Vị trí đã tồn tại' }, { status: 409 })))
  mount(); const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Tên vị trí'), 'THU NGÂN')
  await user.click(screen.getByRole('button', { name: 'Tạo vị trí' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Vị trí đã tồn tại')
  expect(screen.getByLabelText('Tên vị trí')).toHaveValue('THU NGÂN')
})
it('asks for confirmation then deactivates and can reactivate a position', async () => {
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Ngừng sử dụng Thu ngân' }))
  expect(rows[0].active).toBe(true)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }))
  await user.click(await screen.findByRole('button', { name: 'Sử dụng lại Thu ngân' }))
  expect(sent[0]).toEqual({ active: false, version: 0 })
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByRole('button', { name: 'Ngừng sử dụng Thu ngân' })).toBeInTheDocument()
  expect(sent[1]).toEqual({ active: true, version: 1 })
})
it('filters and searches positions on the server', async () => {
  mount(); const user = userEvent.setup()
  await screen.findByText('Thu ngân')
  await user.selectOptions(screen.getByLabelText('Trạng thái vị trí'), 'false')
  await waitFor(() => expect(queries.at(-1)?.get('active')).toBe('false'))
  await user.type(screen.getByLabelText('Tìm vị trí'), 'Pha')
  await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  await waitFor(() => expect(queries.at(-1)?.get('q')).toBe('Pha'))
})
it('shows a catalog load error and retries', async () => {
  server.use(http.get(base + '/positions', () => HttpResponse.json({ message: 'Lỗi kết nối danh mục' }, { status: 503 })))
  mount(); const user = userEvent.setup()
  expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi kết nối danh mục')
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Thu ngân')).toBeInTheDocument()
})
it('requests subsequent catalog pages', async () => {
  server.use(http.get(base + '/positions', ({ request }) => {
    const q = new URL(request.url).searchParams; queries.push(q)
    return HttpResponse.json(page(rows, Number(q.get('page')), 2))
  }))
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(queries.at(-1)?.get('page')).toBe('1'))
})
