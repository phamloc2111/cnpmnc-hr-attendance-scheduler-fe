import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { RegistrationPage } from './RegistrationPage'
import { canEdit } from './api'
import type { RegistrationShift, RegistrationWeek } from './api'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'

const base = 'http://localhost:8080/api/v1'
const morning: RegistrationShift = { id: 'morning', name: 'Ca sáng', startTime: '08:00:00', endTime: '12:00:00', breakMinutes: 30, workingMinutes: 210, overnight: false, requiredPosition: 'Thu ngân' }
const night: RegistrationShift = { ...morning, id: 'night', name: 'Ca đêm', startTime: '22:00:00', endTime: '06:00:00', overnight: true, workingMinutes: 450 }
let week: RegistrationWeek
let writes: { weekStart: string; revision: string; shiftIds: string[] }[]
let role: 'EMPLOYEE' | 'MANAGER'
const server = setupServer(
  http.get(base + '/registrations/me', ({ request }) => HttpResponse.json({ ...week, weekStart: new URL(request.url).searchParams.get('weekStart') ?? week.weekStart })),
  http.get(base + '/registrations/shifts', () => HttpResponse.json({ items: [morning, night], page: 0, size: 20, totalElements: 2, totalPages: 1 })),
  http.put(base + '/registrations/me', async ({ request }) => {
    const body = await request.json() as typeof writes[number]; writes.push(body)
    week = { ...week, revision: 'b'.repeat(64), shifts: [morning, night].filter(shift => body.shiftIds.includes(shift.id)) }
    return HttpResponse.json(week)
  }),
  http.get(base + '/auth/me', () => HttpResponse.json({ id: 'user', displayName: 'An', email: 'an@example.com', role })),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  writes = []; role = 'EMPLOYEE'
  week = { weekStart: '2026-11-16', weekEnd: '2026-11-22', serverNow: '2026-11-15T05:00:00Z', opensAt: '2026-11-14T17:00:00Z', closesAt: '2026-11-15T17:00:00Z', editable: true, revision: 'a'.repeat(64), shifts: [] }
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); sessionStorage.clear(); window.location.hash = '' })
afterAll(() => server.close())

it('saves, edits and clears selections without converting them to assigned schedules', async () => {
  const user = userEvent.setup(); render(<RegistrationPage />)
  expect(await screen.findByText('Đang mở đăng ký')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeDisabled()
  await user.click(await screen.findByRole('checkbox', { name: 'Đăng ký Ca sáng' }))
  await user.click(screen.getByRole('button', { name: 'Lưu đăng ký' }))
  expect(await screen.findByText('Đã lưu đăng ký ca cho tuần này.')).toBeInTheDocument()
  expect(writes).toEqual([{ weekStart: '2026-11-16', revision: 'a'.repeat(64), shiftIds: ['morning'] }])
  await user.click(screen.getByRole('button', { name: 'Bỏ Ca sáng' }))
  await user.click(screen.getByRole('button', { name: 'Lưu đăng ký' }))
  expect(await screen.findByText('Đã xóa các ca đăng ký của tuần này.')).toBeInTheDocument()
  expect(writes[1]).toEqual({ weekStart: '2026-11-16', revision: 'b'.repeat(64), shiftIds: [] })
  expect(screen.getByText(/chưa phải lịch được phân/)).toBeInTheDocument()
})
it('ignores the device wall clock and disables selection outside the server window', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-01T00:00:00Z'))
  week = { ...week, editable: false, shifts: [night] }
  render(<RegistrationPage />)
  expect(await screen.findByText('Chỉ xem đăng ký')).toBeInTheDocument()
  expect(await screen.findByRole('checkbox', { name: 'Đăng ký Ca đêm' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Đăng ký Ca sáng' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Bỏ Ca đêm' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeDisabled()
})
it('closes an already-open form when the deadline passes on a background tab', async () => {
  let elapsed = 0; vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  week = { ...week, serverNow: '2026-11-15T16:59:59Z' }
  render(<RegistrationPage />)
  const checkbox = await screen.findByRole('checkbox', { name: 'Đăng ký Ca sáng' })
  await waitFor(() => expect(checkbox).toBeEnabled())
  fireEvent.click(checkbox)
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeEnabled()
  elapsed = 1000
  act(() => window.dispatchEvent(new Event('focus')))
  expect(screen.getByText('Chỉ xem đăng ký')).toBeInTheDocument()
  expect(checkbox).toBeChecked(); expect(checkbox).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeDisabled()
})
it('preserves the draft after a conflict and requires explicit reload before saving again', async () => {
  server.use(http.put(base + '/registrations/me', () => HttpResponse.json({ message: 'Đăng ký vừa thay đổi. Hãy tải lại.' }, { status: 409 })))
  const user = userEvent.setup(); render(<RegistrationPage />)
  await user.click(await screen.findByRole('checkbox', { name: 'Đăng ký Ca sáng' }))
  await user.click(screen.getByRole('button', { name: 'Lưu đăng ký' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Hãy tải lại')
  expect(screen.getByRole('checkbox', { name: 'Đăng ký Ca sáng' })).toBeChecked()
  expect(screen.getByRole('button', { name: 'Lưu đăng ký' })).toBeDisabled()
  week = { ...week, revision: 'c'.repeat(64), shifts: [night] }
  await user.click(screen.getByRole('button', { name: 'Tải lại' }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Đăng ký Ca đêm' })).toBeChecked())
  expect(screen.getByRole('checkbox', { name: 'Đăng ký Ca sáng' })).not.toBeChecked()
})
it('keeps selected shifts across catalog pages and includes all pages in the saved draft', async () => {
  server.use(http.get(base + '/registrations/shifts', ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get('page'))
    return HttpResponse.json({ items: [page === 0 ? morning : night], page, size: 20, totalElements: 21, totalPages: 2 })
  }))
  const user = userEvent.setup(); render(<RegistrationPage />)
  await user.click(await screen.findByRole('checkbox', { name: 'Đăng ký Ca sáng' }))
  await user.click(screen.getByRole('button', { name: 'Trang sau' }))
  await user.click(await screen.findByRole('checkbox', { name: 'Đăng ký Ca đêm' }))
  expect(screen.getByRole('button', { name: 'Bỏ Ca sáng' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Lưu đăng ký' }))
  await screen.findByText('Đã lưu đăng ký ca cho tuần này.')
  expect(writes[0].shiftIds).toEqual(['morning', 'night'])
})
it('can read historical weeks and returns to the server-selected next week', async () => {
  const requested: (string | null)[] = []
  server.use(http.get(base + '/registrations/me', ({ request }) => {
    const query = new URL(request.url).searchParams.get('weekStart'); requested.push(query)
    return HttpResponse.json({ ...week, weekStart: query ?? week.weekStart, editable: !query })
  }))
  const user = userEvent.setup(); render(<RegistrationPage />)
  await screen.findByText('Đang mở đăng ký')
  fireEvent.change(screen.getByLabelText('Tuần đăng ký', { selector: 'input' }), { target: { value: '2026-11-05' } })
  expect(await screen.findByText('Chỉ xem đăng ký')).toBeInTheDocument()
  expect(requested.at(-1)).toBe('2026-11-02')
  await user.click(screen.getByRole('button', { name: 'Tuần kế tiếp' }))
  expect(await screen.findByText('Đang mở đăng ký')).toBeInTheDocument()
  expect(requested.at(-1)).toBe(null)
})
it('handles a failed registration load and retries without allowing a blind save', async () => {
  let fail = true
  server.use(http.get(base + '/registrations/me', () => fail ? HttpResponse.json({ message: 'Mất kết nối' }, { status: 503 }) : HttpResponse.json(week)))
  const user = userEvent.setup(); render(<RegistrationPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối')
  expect(screen.queryByRole('button', { name: 'Lưu đăng ký' })).not.toBeInTheDocument()
  fail = false; await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Đang mở đăng ký')).toBeInTheDocument()
})
it('shows an empty catalog without treating it as an error', async () => {
  server.use(http.get(base + '/registrations/shifts', () => HttpResponse.json({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })))
  render(<RegistrationPage />)
  expect(await screen.findByText(/Chưa có mẫu ca/)).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it.each(['EMPLOYEE', 'MANAGER'] as const)('restricts the new route for %s', async value => {
  role = value; window.location.hash = '/registrations'
  saveSession({ accessToken: 'test-token', expiresAt: new Date(Date.now() + 3600000).toISOString() })
  render(<AuthProvider><App /></AuthProvider>)
  if (role === 'EMPLOYEE') expect(await screen.findByRole('heading', { name: 'Đăng ký ca' })).toBeInTheDocument()
  else expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
})
it('uses inclusive opening and exclusive closing instants in Vietnam time', () => {
  week = { ...week, serverNow: week.opensAt }
  expect(canEdit(week, 0)).toBe(true)
  week = { ...week, serverNow: '2026-11-15T16:59:59.999Z' }
  expect(canEdit(week, 0)).toBe(true); expect(canEdit(week, 1)).toBe(false)
  expect(canEdit({ ...week, editable: false }, 0)).toBe(false)
})
