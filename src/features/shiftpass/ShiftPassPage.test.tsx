import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { addDays, vietnamToday } from '../../shared/utils/dates'
import { ShiftPassPage } from './ShiftPassPage'

const base = 'http://localhost:8080/api/v1'
const futureDate = addDays(vietnamToday(), 2)
const futureStart = futureDate + 'T08:00:00+07:00'
const futureEnd = futureDate + 'T12:00:00+07:00'

let passesState: Array<Record<string, unknown>> = []
let postedBody: Record<string, unknown> | null = null
let cancelledId = ''

const server = setupServer(
  http.get(base + '/work-schedules', () =>
    HttpResponse.json({
      items: [
        {
          id: 'sched-1',
          employeeId: 'emp-1',
          employeeName: 'Nguyễn Văn An',
          shiftTemplateId: 'tpl-1',
          workDate: futureDate,
          shiftName: 'Ca sáng',
          startsAt: futureStart,
          endsAt: futureEnd,
          breakMinutes: 0,
          workingMinutes: 240,
          timezone: 'Asia/Ho_Chi_Minh',
          requiredPosition: 'Thu ngân',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    }),
  ),
  http.get(base + '/shift-passes/mine', () => HttpResponse.json(passesState)),
  http.get(base + '/shift-passes/notifications', () =>
    HttpResponse.json([
      {
        id: 'notif-1',
        shiftPassId: 'pass-colleague-1',
        kind: 'PASS_OFFERED',
        title: 'Có ca cần pass: Ca chiều',
        body: 'Trần Bình đăng pass ca Ca chiều (Vị trí: Thu ngân).',
        status: 'OPEN',
        createdAt: '2026-11-20T01:00:00Z',
        closedAt: null,
      },
    ]),
  ),
  http.post(base + '/shift-passes', async ({ request }) => {
    postedBody = (await request.json()) as Record<string, unknown>
    const created = {
      id: 'pass-new-1',
      scheduleId: 'sched-1',
      requesterId: 'emp-1',
      requesterName: 'Nguyễn Văn An',
      claimerId: null,
      claimerName: null,
      workDate: futureDate,
      shiftName: 'Ca sáng',
      startsAt: futureStart,
      endsAt: futureEnd,
      breakMinutes: 0,
      workingMinutes: 240,
      requiredPositionId: 'pos-1',
      requiredPosition: 'Thu ngân',
      reason: postedBody.reason ?? null,
      status: 'OPEN',
      createdAt: '2026-11-20T02:00:00Z',
      claimedAt: null,
      notifiedCount: 3,
    }
    passesState = [created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.delete(base + '/shift-passes/:id', ({ params }) => {
    cancelledId = String(params.id)
    passesState = passesState.map(p => (p.id === cancelledId ? { ...p, status: 'CANCELLED' } : p))
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  passesState = []
  postedBody = null
  cancelledId = ''
})
afterAll(() => server.close())

it('allows employee to post a shift pass, notifies same-position colleagues, and supports cancellation', async () => {
  const user = userEvent.setup()
  render(<ShiftPassPage />)

  expect(await screen.findByText('Có ca cần pass: Ca chiều')).toBeInTheDocument()
  const select = await screen.findByLabelText('Chọn ca làm cần pass')
  expect(select).toHaveValue('sched-1')

  await user.type(screen.getByLabelText('Lý do nhường ca (không bắt buộc)'), 'Bận việc gia đình')
  await user.click(screen.getByRole('button', { name: 'Đăng pass ca' }))

  expect(
    await screen.findByText(/gửi thông báo đẩy đến 3 nhân viên cùng vị trí.*ca vẫn thuộc về bạn/i),
  ).toBeInTheDocument()
  expect(postedBody).toEqual({ scheduleId: 'sched-1', reason: 'Bận việc gia đình' })
  expect(await screen.findByText('Đang chờ nhận (Ca vẫn thuộc về bạn)')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Hủy pass ca' }))
  await waitFor(() => expect(cancelledId).toBe('pass-new-1'))
  expect(await screen.findByText('Đã hủy yêu cầu')).toBeInTheDocument()
})
