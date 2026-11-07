import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AttendanceResultsPage } from './AttendanceResultsPage'

const queries: URLSearchParams[] = []
const row = { scheduleId: 'schedule', employeeId: 'employee', employeeName: 'Nguyễn An', workDate: '2026-11-05', shiftName: 'Ca sáng', startsAt: '2026-11-05T01:00:00Z', endsAt: '2026-11-05T10:00:00Z', checkInAt: '2026-11-05T01:06:00Z', checkOutAt: '2026-11-05T09:54:00Z', arrival: 'LATE', departure: 'EARLY_LEAVE', overall: 'LATE_AND_EARLY_LEAVE', lateMinutes: 6, earlyMinutes: 6 }
const server = setupServer(http.get('http://localhost:8080/api/v1/attendance/results', ({ request }) => {
  const query = new URL(request.url).searchParams; queries.push(query)
  return HttpResponse.json({ items: [row, { ...row, scheduleId: 'absent', employeeName: 'Nhân viên vắng', checkInAt: null, checkOutAt: null, arrival: 'ABSENT', departure: 'PENDING', overall: 'ABSENT', lateMinutes: 0, earlyMinutes: 0 }], page: Number(query.get('page')), size: 20, totalPages: 2, totalElements: 21 })
}))
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => { queries.length = 0; vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-07T03:00:00Z')) })
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
it('shows both violations, their minute counts, and absence without any attendance event', async () => {
  render(<AttendanceResultsPage />)
  expect(await screen.findByText('Trễ và về sớm')).toBeInTheDocument()
  expect(screen.getByText('Trễ 6 phút')).toBeInTheDocument()
  expect(screen.getByText('Về sớm 6 phút')).toBeInTheDocument()
  expect(screen.getByText('Nhân viên vắng')).toBeInTheDocument()
  expect(screen.getAllByText('Vắng')).toHaveLength(2)
  expect(screen.getByText('05/11/2026 08:06')).toBeInTheDocument()
})
it('uses server paging and resets the page on a week change', async () => {
  render(<AttendanceResultsPage />); const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(queries.at(-1)?.get('page')).toBe('1'))
  await user.click(screen.getByRole('button', { name: 'Tuần sau' }))
  await waitFor(() => expect(queries.at(-1)?.get('from')).toBe('2026-11-09'))
  expect(queries.at(-1)?.get('page')).toBe('0')
})
it('offers retry for errors', async () => {
  server.use(http.get('http://localhost:8080/api/v1/attendance/results', () => HttpResponse.json({ message: 'Không tải được kết quả' }, { status: 503 })))
  render(<AttendanceResultsPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được kết quả')
  server.resetHandlers(); await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
})
