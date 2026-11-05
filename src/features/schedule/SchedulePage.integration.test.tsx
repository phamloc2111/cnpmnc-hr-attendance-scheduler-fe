import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { Role } from '../auth'
import type { Shift, WorkSchedule } from './types'

const base = 'http://localhost:8080/api/v1'
const shift: Shift = { id: 'shift-1', name: 'Ca đêm', startTime: '22:00:00', endTime: '06:00:00', breakMinutes: 30, workingMinutes: 450, overnight: true, requiredHeadcount: 2, requiredPosition: 'Thu ngân' }
const row: WorkSchedule = { id: 'schedule-1', employeeId: 'employee-1', employeeName: 'Nguyễn An', shiftTemplateId: shift.id, workDate: '2026-11-05', shiftName: 'Ca đêm', startsAt: '2026-11-05T15:00:00Z', endsAt: '2026-11-05T23:00:00Z', breakMinutes: 30, workingMinutes: 450, timezone: 'Asia/Ho_Chi_Minh' }
let rows: WorkSchedule[] = []
let shifts: Shift[] = []
let role: Role = 'MANAGER'
let requests: URLSearchParams[] = []
let bodies: Record<string, unknown>[] = []
const page = <T,>(items: T[], index = 0, totalPages = 1) => ({ items, page: index, size: 20, totalElements: items.length, totalPages })
const server = setupServer(
  http.get(base + '/auth/me', () => HttpResponse.json({ id: 'actor', displayName: 'Quản lý', email: 'actor@example.com', role })),
  http.get(base + '/work-schedules', ({ request }) => {
    const query = new URL(request.url).searchParams; requests.push(query)
    return HttpResponse.json(page(rows))
  }),
  http.get(base + '/shift-templates', () => HttpResponse.json(page(shifts))),
  http.post(base + '/shift-templates', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>; bodies.push(body)
    const minutes = (value: string) => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1])
    const created: Shift = { id: 'new-shift', name: body.name as string, startTime: body.startTime as string, endTime: body.endTime as string, breakMinutes: body.breakMinutes as number, overnight: body.overnight as boolean, requiredHeadcount: body.requiredHeadcount as number, requiredPosition: body.requiredPosition as string, workingMinutes: (minutes(body.endTime as string) - minutes(body.startTime as string) + 1440) % 1440 - Number(body.breakMinutes) }
    shifts = [created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.get(base + '/accounts', () => HttpResponse.json(page([{ id: 'employee-1', displayName: 'Nguyễn An', email: 'an@example.com' }]))),
  http.post(base + '/work-schedules', async ({ request }) => {
    bodies.push(await request.json() as Record<string, unknown>); rows = [row]
    return HttpResponse.json(row, { status: 201 })
  }),
  http.delete(base + '/work-schedules/:id', () => { rows = []; return new HttpResponse(null, { status: 204 }) }),
)
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
})
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-05T03:00:00Z'))
  role = 'MANAGER'; rows = []; shifts = [shift]; requests = []; bodies = []
  sessionStorage.clear()
  saveSession({ accessToken: 'test-token', expiresAt: '2026-11-05T04:00:00Z' })
  window.location.hash = '/schedules'
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
function mount() { render(<AuthProvider><App /></AuthProvider>) }
async function openAssignment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Phân ca' }))
  const dialog = within(screen.getByRole('dialog'))
  await user.click(await dialog.findByRole('button', { name: /Nguyễn An/ }))
  await user.selectOptions(await dialog.findByLabelText('Mẫu ca'), shift.id)
  return dialog
}
it('loads current Vietnam week with an empty state', async () => {
  mount()
  expect(await screen.findByText('Chưa có lịch trong tuần này')).toBeInTheDocument()
  expect(requests[0].get('from')).toBe('2026-11-02')
  expect(requests[0].get('to')).toBe('2026-11-08')
})
it('shows overnight times and next date in Vietnam', async () => {
  rows = [row]; mount()
  expect(await screen.findByText('Ca đêm')).toBeInTheDocument()
  expect(screen.getByText(/22:00.*06:00/)).toHaveTextContent(/06\/11/)
  expect(screen.getByText('450 phút')).toBeInTheDocument()
})
it('creates a shift template through the API', async () => {
  shifts = []; mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Mẫu ca' }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByLabelText('Tên ca'), 'Ca sáng')
  await user.type(dialog.getByLabelText('Vị trí cần'), 'Thu ngân')
  await user.clear(dialog.getByLabelText('Số người cần'))
  await user.type(dialog.getByLabelText('Số người cần'), '2')
  await user.click(dialog.getByRole('button', { name: 'Tạo mẫu ca' }))
  await waitFor(() => expect(bodies).toHaveLength(1))
  expect(bodies[0]).toEqual({ name: 'Ca sáng', startTime: '08:00', endTime: '17:00', breakMinutes: 60, requiredHeadcount: 2, requiredPosition: 'Thu ngân', overnight: false })
  expect(await dialog.findByText('Ca sáng')).toBeInTheDocument()
  expect(dialog.getByText('2 người · Thu ngân')).toBeInTheDocument()
})
it('rejects a blank shift name before posting', async () => {
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Mẫu ca' }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByLabelText('Tên ca'), '   ')
  await user.type(dialog.getByLabelText('Vị trí cần'), 'Thu ngân')
  await user.click(dialog.getByRole('button', { name: 'Tạo mẫu ca' }))
  expect(await dialog.findByRole('alert')).toHaveTextContent('Tên ca không được trống')
  expect(bodies).toHaveLength(0)
})
it('requires an explicit overnight flag for an overnight shift', async () => {
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Mẫu ca' }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByLabelText('Tên ca'), 'Ca tối')
  await user.type(dialog.getByLabelText('Vị trí cần'), 'Bảo vệ')
  await user.clear(dialog.getByLabelText('Giờ bắt đầu')); await user.type(dialog.getByLabelText('Giờ bắt đầu'), '22:00')
  await user.clear(dialog.getByLabelText('Giờ kết thúc')); await user.type(dialog.getByLabelText('Giờ kết thúc'), '06:00')
  await user.click(dialog.getByRole('button', { name: 'Tạo mẫu ca' }))
  expect(await dialog.findByRole('alert')).toHaveTextContent('Chỉ đánh dấu ca qua đêm')
  expect(bodies).toHaveLength(0)
  await user.click(dialog.getByRole('checkbox', { name: 'Ca qua đêm' }))
  await user.click(dialog.getByRole('button', { name: 'Tạo mẫu ca' }))
  await waitFor(() => expect(bodies).toHaveLength(1))
  expect(bodies[0]).toMatchObject({ startTime: '22:00', endTime: '06:00', overnight: true, requiredHeadcount: 1, requiredPosition: 'Bảo vệ' })
  expect(await dialog.findByText('Ca tối')).toBeInTheDocument()
  expect(dialog.getByText(/22:00.*06:00.*\(\+1 ngày\)/)).toBeInTheDocument()
})
it('rejects fewer than one required employee before posting', async () => {
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Mẫu ca' }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByLabelText('Tên ca'), 'Ca sáng')
  await user.type(dialog.getByLabelText('Vị trí cần'), 'Thu ngân')
  await user.clear(dialog.getByLabelText('Số người cần')); await user.type(dialog.getByLabelText('Số người cần'), '0')
  await user.click(dialog.getByRole('button', { name: 'Tạo mẫu ca' }))
  expect(dialog.getByLabelText('Số người cần')).toBeInvalid()
  expect(bodies).toHaveLength(0)
})
it('requires a nonblank position', async () => {
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Mẫu ca' }))
  const dialog = within(screen.getByRole('dialog'))
  await user.type(dialog.getByLabelText('Tên ca'), 'Ca sáng')
  await user.type(dialog.getByLabelText('Vị trí cần'), '   ')
  await user.click(dialog.getByRole('button', { name: 'Tạo mẫu ca' }))
  expect(await dialog.findByRole('alert')).toHaveTextContent('Vui lòng nhập vị trí cần')
  expect(bodies).toHaveLength(0)
})
it('shows legacy templates without inventing a position', async () => {
  shifts = [{ ...shift, requiredPosition: null }]
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Mẫu ca' }))
  expect(await within(screen.getByRole('dialog')).findByText('2 người · Chưa khai báo vị trí')).toBeInTheDocument()
})
it('assigns a selected employee and shift then reloads the week', async () => {
  mount(); const user = userEvent.setup(); const dialog = await openAssignment(user)
  await user.click(dialog.getByRole('button', { name: 'Lưu phân ca' }))
  expect(await screen.findByText('Đã phân ca cho nhân viên.')).toBeInTheDocument()
  expect(bodies).toEqual([{ employeeId: 'employee-1', shiftTemplateId: 'shift-1', workDate: '2026-11-02' }])
  expect(await screen.findByText('Ca đêm')).toBeInTheDocument()
})
it('keeps assignment open and displays overlap errors', async () => {
  server.use(http.post(base + '/work-schedules', () => HttpResponse.json({ message: 'Nhân viên đã có ca trùng giờ' }, { status: 409 })))
  mount(); const user = userEvent.setup(); const dialog = await openAssignment(user)
  await user.click(dialog.getByRole('button', { name: 'Lưu phân ca' }))
  expect(await dialog.findByRole('alert')).toHaveTextContent('Nhân viên đã có ca trùng giờ')
  expect(dialog.getByRole('button', { name: 'Lưu phân ca' })).toBeEnabled()
})
it('cancels a schedule only after confirmation', async () => {
  rows = [row]; mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Hủy ca Nguyễn An Ca đêm' }))
  expect(rows).toHaveLength(1)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận hủy' }))
  expect(await screen.findByText('Đã hủy ca làm.')).toBeInTheDocument()
  expect(await screen.findByText('Chưa có lịch trong tuần này')).toBeInTheDocument()
})
it('loads the next week from the server', async () => {
  mount(); const user = userEvent.setup()
  await screen.findByText('Chưa có lịch trong tuần này')
  await user.click(screen.getByRole('button', { name: 'Tuần sau' }))
  await waitFor(() => expect(requests.at(-1)?.get('from')).toBe('2026-11-09'))
})
it('loads the next server page', async () => {
  server.use(http.get(base + '/work-schedules', ({ request }) => {
    const query = new URL(request.url).searchParams; requests.push(query)
    return HttpResponse.json(page([row], Number(query.get('page')), 2))
  }))
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('1'))
  expect(await screen.findByText('Trang 2 / 2')).toBeInTheDocument()
})
it('shows API errors and supports retry', async () => {
  server.use(http.get(base + '/work-schedules', () => HttpResponse.json({ message: 'Máy chủ tạm lỗi' }, { status: 503 })))
  mount(); const user = userEvent.setup()
  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ tạm lỗi')
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Chưa có lịch trong tuần này')).toBeInTheDocument()
})
it('employees can view their schedule without assignment actions', async () => {
  role = 'EMPLOYEE'; window.location.hash = '/my-schedule'; rows = [row]; mount()
  expect(await screen.findByRole('heading', { name: 'Lịch của tôi' })).toBeInTheDocument()
  expect(await screen.findByText('Ca đêm')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Phân ca' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Hủy ca/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Mẫu ca' })).not.toBeInTheDocument()
})
it('expired schedule requests return to login', async () => {
  server.use(http.get(base + '/work-schedules', () => HttpResponse.json({ message: 'Hết phiên' }, { status: 401 })))
  mount()
  expect(await screen.findByRole('button', { name: 'Đăng nhập →' })).toBeInTheDocument()
  expect(sessionStorage.getItem('shiftsync.session')).toBeNull()
})
