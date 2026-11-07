import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { WorkSchedule } from '../schedule'
import { InstallApp } from './InstallApp'
import { shiftSummary } from './home'

const base = 'http://localhost:8080/api/v1'
const row: WorkSchedule = { id: 'shift-1', employeeId: 'employee', employeeName: 'Nguyễn An', shiftTemplateId: 'template',
  workDate: '2026-11-09', shiftName: 'Ca sáng', startsAt: '2026-11-09T00:00:00Z', endsAt: '2026-11-09T04:00:00Z',
  breakMinutes: 0, workingMinutes: 240, timezone: 'Asia/Ho_Chi_Minh', requiredPosition: 'Thu ngân' }
let rows: WorkSchedule[] = []
let requests: URLSearchParams[] = []
let role = 'EMPLOYEE'
let now = Date.parse('2026-11-09T00:30:00Z')
const server = setupServer(
  http.get(base + '/auth/me', () => HttpResponse.json({ id: 'employee', email: 'an@example.com', displayName: 'Nguyễn An', role })),
  http.get(base + '/work-schedules', ({ request }) => {
    requests.push(new URL(request.url).searchParams)
    return HttpResponse.json({ items: rows, page: 0, totalPages: rows.length ? 1 : 0, totalElements: rows.length })
  }),
  http.get(base + '/attendance/events', () => HttpResponse.json([])),
)
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
})
beforeEach(() => {
  vi.unstubAllGlobals()
  now = Date.parse('2026-11-09T00:30:00Z')
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  rows = [row]; requests = []; role = 'EMPLOYEE'
  sessionStorage.clear(); saveSession({ accessToken: 'test-token', expiresAt: '2026-11-12T00:00:00Z' })
  window.location.hash = '/employee'
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
const mount = () => render(<AuthProvider><App /></AuthProvider>)

it('shows the assigned shift with Vietnamese date, Vietnam time and position', async () => {
  mount()
  expect(await screen.findByText('Thứ Hai, 09/11/2026 · 07:00–11:00 · Thu ngân')).toBeInTheDocument()
  expect(requests[0]?.get('from')).toBe('2026-11-08')
  expect(requests[0]?.get('to')).toBe('2026-11-09')
  expect(screen.getByRole('button', { name: 'Điểm danh' })).toBeEnabled()
  expect(screen.getByRole('link', { name: 'Xem lịch của tôi →' })).toHaveAttribute('href', '#/my-schedule')
})

it('opens the real attendance flow for the selected shift', async () => {
  rows = [row, { ...row, id: 'shift-2', shiftName: 'Ca chiều', startsAt: '2026-11-09T06:00:00Z', endsAt: '2026-11-09T10:00:00Z' }]
  mount(); const user = userEvent.setup()
  await user.click(await screen.findByRole('radio', { name: 'Chọn Ca chiều để điểm danh' }))
  await user.click(screen.getByRole('button', { name: 'Điểm danh' }))
  expect(window.location.hash).toBe('#/attendance?date=2026-11-09&schedule=shift-2')
  expect(await screen.findByRole('heading', { name: 'Chấm công bằng ảnh Timemark' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Ca chiều')
})

it('keeps the attendance action visible but disabled when no shift exists', async () => {
  rows = []
  mount()
  expect(await screen.findByText('Hôm nay bạn chưa có ca')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Điểm danh' })).toBeDisabled()
})

it('does not enable attendance while loading', async () => {
  let release!: () => void
  const ready = new Promise<void>(resolve => { release = resolve })
  server.use(http.get(base + '/work-schedules', async () => { await ready; return HttpResponse.json({ items: [], page: 0, totalPages: 0 }) }))
  mount()
  expect(await screen.findByText('Đang tải ca hôm nay…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Điểm danh' })).toBeDisabled()
  release()
  await screen.findByText('Hôm nay bạn chưa có ca')
})

it('shows network errors and retries without displaying sample shifts', async () => {
  server.use(http.get(base + '/work-schedules', () => HttpResponse.json({ message: 'Mất kết nối lịch' }, { status: 503 })))
  mount(); const user = userEvent.setup()
  expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối lịch')
  expect(screen.getByRole('button', { name: 'Điểm danh' })).toBeDisabled()
  expect(screen.queryByText('Ca sáng')).not.toBeInTheDocument()
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('heading', { name: 'Ca sáng' })).toBeInTheDocument()
})

it('keeps an ongoing previous-day overnight shift and ignores ended previous shifts', async () => {
  now = Date.parse('2026-11-08T18:00:00Z') // 01:00 Monday in Vietnam, Sunday in UTC.
  rows = [
    { ...row, id: 'night', workDate: '2026-11-08', shiftName: 'Ca đêm', startsAt: '2026-11-08T15:00:00Z', endsAt: '2026-11-08T23:00:00Z' },
    { ...row, id: 'old', workDate: '2026-11-08', shiftName: 'Ca đã qua', startsAt: '2026-11-08T00:00:00Z', endsAt: '2026-11-08T04:00:00Z' },
  ]
  mount()
  expect(await screen.findByText('Ca đêm đang tiếp tục')).toBeInTheDocument()
  expect(screen.getByText('Chủ Nhật, 08/11/2026 · 22:00–06:00 (+1 ngày) · Thu ngân')).toBeInTheDocument()
  expect(screen.queryByText('Ca đã qua')).not.toBeInTheDocument()
  expect(requests[0]?.get('to')).toBe('2026-11-09')
})

it('does not allow preparing attendance for ended shifts', async () => {
  now = Date.parse('2026-11-09T05:00:00Z')
  mount()
  expect(await screen.findByText('Đã kết thúc')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Điểm danh' })).toBeDisabled()
})

it('loads every page in the two-day range', async () => {
  server.use(http.get(base + '/work-schedules', ({ request }) => {
    const query = new URL(request.url).searchParams; requests.push(query)
    const page = Number(query.get('page'))
    return HttpResponse.json({ items: [{ ...row, id: String(page), shiftName: page ? 'Ca trang hai' : 'Ca trang một' }], page, totalPages: 2 })
  }))
  mount()
  expect(await screen.findByText('Ca trang hai')).toBeInTheDocument()
  expect(requests.map(query => query.get('page'))).toEqual(['0', '1'])
})

it('refreshes the Vietnam work date when returning after midnight', async () => {
  mount()
  await screen.findByRole('heading', { name: 'Ca sáng' })
  now = Date.parse('2026-11-09T17:05:00Z') // Tuesday 00:05 Vietnam.
  fireEvent(window, new Event('focus'))
  await waitFor(() => expect(requests.at(-1)?.get('to')).toBe('2026-11-10'))
})

it('denies the employee home route to management roles', async () => {
  role = 'MANAGER'; mount()
  expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
  expect(requests).toHaveLength(0)
})

it('shows a clear position fallback for legacy schedules', () => {
  expect(shiftSummary({ ...row, requiredPosition: null })).toContain('Chưa có vị trí')
})

it('offers manual home-screen installation instructions', () => {
  render(<InstallApp />)
  expect(screen.getByText(/Trên iPhone: mở bằng Safari/)).toBeInTheDocument()
})

it('uses the browser install prompt when it is available', async () => {
  render(<InstallApp />)
  const prompt = vi.fn(async () => undefined)
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
  fireEvent(window, event)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm vào màn hình chính' }))
  await waitFor(() => expect(prompt).toHaveBeenCalledOnce())
  await waitFor(() => expect(screen.queryByText('Mở ShiftSync nhanh hơn')).not.toBeInTheDocument())
})
