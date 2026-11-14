import { render, screen, waitFor, within } from '@testing-library/react'
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
let availableState: Array<Record<string, unknown>> = []
let notifState: Array<Record<string, unknown>> = []
let postedBody: Record<string, unknown> | null = null
let cancelledId = ''
let claimedId = ''
let conflictOnClaim = false

const defaultNotif = {
  id: 'notif-1',
  shiftPassId: 'pass-colleague-1',
  kind: 'PASS_OFFERED',
  title: 'Có ca cần pass: Ca chiều',
  body: 'Trần Bình đăng pass ca Ca chiều (Vị trí: Thu ngân).',
  status: 'OPEN',
  createdAt: '2026-11-20T01:00:00Z',
  closedAt: null,
}

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
  http.get(base + '/shift-passes/available', () => HttpResponse.json(availableState)),
  http.get(base + '/shift-passes/notifications', () => HttpResponse.json(notifState)),
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
  http.post(base + '/shift-passes/:id/claim', ({ params }) => {
    claimedId = String(params.id)
    if (conflictOnClaim) {
      availableState = []
      notifState = notifState.map(n => ({ ...n, status: 'CLOSED' }))
      return HttpResponse.json(
        { code: 'PASS_ALREADY_CLOSED', message: 'Ca pass này đã có người khác nhận hoặc đã đóng.' },
        { status: 409 },
      )
    }
    availableState = availableState.filter(p => p.id !== claimedId)
    notifState = notifState.map(n => (n.shiftPassId === claimedId ? { ...n, status: 'CLOSED' } : n))
    return HttpResponse.json({
      id: claimedId,
      scheduleId: 'sched-2',
      requesterId: 'emp-2',
      requesterName: 'Trần Bình',
      claimerId: 'emp-1',
      claimerName: 'Nguyễn Văn An',
      workDate: futureDate,
      shiftName: 'Ca chiều hợp lệ',
      startsAt: futureDate + 'T13:00:00+07:00',
      endsAt: futureDate + 'T17:00:00+07:00',
      breakMinutes: 0,
      workingMinutes: 240,
      requiredPositionId: 'pos-1',
      requiredPosition: 'Thu ngân',
      reason: null,
      status: 'CLAIMED',
      createdAt: '2026-11-20T01:00:00Z',
      claimedAt: '2026-11-20T02:05:00Z',
      notifiedCount: 0,
    })
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
  availableState = []
  notifState = [{ ...defaultNotif }]
  postedBody = null
  cancelledId = ''
  claimedId = ''
  conflictOnClaim = false
})
afterAll(() => server.close())

it('allows employee to post a shift pass, notifies same-position colleagues, and supports cancellation', async () => {
  notifState = [{ ...defaultNotif }]
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

it('shows claim button only for eligible non-overlapping under-48h shifts and closes notifications after claim', async () => {
  const claimableNotifId = 'pass-claim-ok'
  notifState = [
    {
      id: 'notif-ok',
      shiftPassId: claimableNotifId,
      kind: 'PASS_OFFERED',
      title: 'Có ca cần pass: Ca chiều hợp lệ',
      body: 'Trần Bình pass Ca chiều hợp lệ',
      status: 'OPEN',
      createdAt: '2026-11-20T01:00:00Z',
      closedAt: null,
    },
  ]
  availableState = [
    {
      id: claimableNotifId,
      scheduleId: 'sched-2',
      requesterId: 'emp-2',
      requesterName: 'Trần Bình',
      workDate: futureDate,
      shiftName: 'Ca chiều hợp lệ',
      startsAt: futureDate + 'T13:00:00+07:00',
      endsAt: futureDate + 'T17:00:00+07:00',
      breakMinutes: 0,
      workingMinutes: 240,
      requiredPositionId: 'pos-1',
      requiredPosition: 'Thu ngân',
      reason: 'Có việc bận',
      createdAt: '2026-11-20T01:00:00Z',
      eligible: true,
      ineligibleReason: null,
      currentWeekMinutes: 480,
      maxWeeklyMinutes: 2880,
    },
    {
      id: 'pass-overlap',
      scheduleId: 'sched-3',
      requesterId: 'emp-3',
      requesterName: 'Lê Chi',
      workDate: futureDate,
      shiftName: 'Ca trùng giờ',
      startsAt: futureStart,
      endsAt: futureEnd,
      breakMinutes: 0,
      workingMinutes: 240,
      requiredPositionId: 'pos-1',
      requiredPosition: 'Thu ngân',
      reason: null,
      createdAt: '2026-11-20T01:10:00Z',
      eligible: false,
      ineligibleReason: 'Trùng giờ với ca làm bạn đã được phân.',
      currentWeekMinutes: 480,
      maxWeeklyMinutes: 2880,
    },
    {
      id: 'pass-overcap',
      scheduleId: 'sched-4',
      requesterId: 'emp-4',
      requesterName: 'Phạm Dũng',
      workDate: futureDate,
      shiftName: 'Ca vượt giờ',
      startsAt: futureDate + 'T18:00:00+07:00',
      endsAt: futureDate + 'T22:00:00+07:00',
      breakMinutes: 0,
      workingMinutes: 240,
      requiredPositionId: 'pos-1',
      requiredPosition: 'Thu ngân',
      reason: null,
      createdAt: '2026-11-20T01:20:00Z',
      eligible: false,
      ineligibleReason: 'Nhận thêm ca này sẽ vượt quá giới hạn tối đa 48 giờ/tuần.',
      currentWeekMinutes: 2760,
      maxWeeklyMinutes: 2880,
    },
  ]

  const user = userEvent.setup()
  render(<ShiftPassPage />)

  const availableSection = await screen.findByLabelText('Ca đồng nghiệp đang pass')
  expect(await within(availableSection).findByText(/Ca chiều hợp lệ/)).toBeInTheDocument()
  expect(within(availableSection).getByText('Trùng giờ với ca làm bạn đã được phân.')).toBeInTheDocument()
  expect(
    within(availableSection).getByText('Nhận thêm ca này sẽ vượt quá giới hạn tối đa 48 giờ/tuần.'),
  ).toBeInTheDocument()

  // Exactly 1 Claim button shown (for eligible shift only)
  const claimButtons = within(availableSection).getAllByRole('button', { name: 'Nhận ca' })
  expect(claimButtons).toHaveLength(1)

  await user.click(claimButtons[0])
  await waitFor(() => expect(claimedId).toBe(claimableNotifId))
  expect(await screen.findByText(/Đã nhận ca "Ca chiều hợp lệ".*đã báo quản lý/i)).toBeInTheDocument()
  expect(screen.queryByText('Có ca cần pass: Ca chiều hợp lệ')).not.toBeInTheDocument()
})

it('closes stale notifications cleanly when concurrent claim fails with 409', async () => {
  notifState = [{ ...defaultNotif, shiftPassId: 'pass-race' }]
  availableState = [
    {
      id: 'pass-race',
      scheduleId: 'sched-race',
      requesterId: 'emp-2',
      requesterName: 'Trần Bình',
      workDate: futureDate,
      shiftName: 'Ca tranh chấp',
      startsAt: futureDate + 'T13:00:00+07:00',
      endsAt: futureDate + 'T17:00:00+07:00',
      breakMinutes: 0,
      workingMinutes: 240,
      requiredPositionId: 'pos-1',
      requiredPosition: 'Thu ngân',
      reason: null,
      createdAt: '2026-11-20T01:00:00Z',
      eligible: true,
      ineligibleReason: null,
      currentWeekMinutes: 0,
      maxWeeklyMinutes: 2880,
    },
  ]
  conflictOnClaim = true

  const user = userEvent.setup()
  render(<ShiftPassPage />)

  await user.click(await screen.findByRole('button', { name: 'Nhận ca' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Ca pass này đã có người khác nhận hoặc đã đóng.')
  await waitFor(() => {
    expect(screen.queryByText('Có ca cần pass: Ca chiều')).not.toBeInTheDocument()
  })
})
