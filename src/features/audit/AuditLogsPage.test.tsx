import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AuditLogsPage } from './AuditLogsPage'

const base = 'http://localhost:8080/api/v1'

const mockLogs = {
  items: [
    {
      id: 'audit-1',
      actorId: 'admin-1',
      actorName: 'Quản trị viên An',
      targetEmployeeId: 'emp-1',
      targetEmployeeName: 'Lê Thị Bình',
      targetDate: '2026-11-20',
      category: 'SCHEDULE',
      action: 'SCHEDULE_ASSIGNED',
      summary: 'Phân ca Ca sáng cho Lê Thị Bình ngày 2026-11-20',
      oldValue: null,
      newValue: 'Ca: Ca sáng (08:00 - 12:00), Ngày: 2026-11-20',
      occurredAt: '2026-11-20T08:15:00Z'
    },
    {
      id: 'audit-2',
      actorId: 'mgr-1',
      actorName: 'Quản lý Minh',
      targetEmployeeId: 'emp-2',
      targetEmployeeName: 'Trần Văn Cường',
      targetDate: '2026-11-19',
      category: 'ATTENDANCE',
      action: 'DILIGENCE_REVIEW_UPDATED',
      summary: 'Cập nhật xác nhận chuyên cần/giờ công của Trần Văn Cường',
      oldValue: 'Nghỉ: AUTO, Về sớm hợp lệ: false',
      newValue: 'Nghỉ: APPROVED, Về sớm hợp lệ: true',
      occurredAt: '2026-11-19T18:30:00Z'
    }
  ],
  page: 0,
  size: 100,
  totalElements: 2,
  totalPages: 1
}

const requestedUrls: string[] = []

const server = setupServer(
  http.get(base + '/audit-logs', ({ request }) => {
    requestedUrls.push(request.url)
    return HttpResponse.json(mockLogs)
  })
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  requestedUrls.length = 0
})
afterAll(() => server.close())

it('renders read-only audit logs with old/new values and filters by person and date', async () => {
  const user = userEvent.setup()
  render(<AuditLogsPage />)

  expect(await screen.findByText('Quản trị viên An')).toBeInTheDocument()
  expect(screen.getByText('Quản lý Minh')).toBeInTheDocument()
  expect(screen.getByText(/Ca: Ca sáng \(08:00 - 12:00\)/)).toBeInTheDocument()
  expect(screen.getByText(/Nghỉ: APPROVED, Về sớm hợp lệ: true/)).toBeInTheDocument()

  const filterInput = screen.getByLabelText('Lọc theo người (Người sửa / Nhân viên)')
  await user.type(filterInput, 'Minh')

  expect(screen.queryByText('Quản trị viên An')).not.toBeInTheDocument()
  expect(screen.getByText('Quản lý Minh')).toBeInTheDocument()

  await user.type(screen.getByLabelText('Từ ngày'), '2026-11-19')
  await user.type(screen.getByLabelText('Đến ngày'), '2026-11-20')

  await screen.findByText('Quản lý Minh')
  expect(requestedUrls.some(url => url.includes('from=2026-11-19') && url.includes('to=2026-11-20'))).toBe(true)
})
