import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { Role } from '../auth'
import type { AttendanceRecord, RegisteredDevice } from './types'

const base = 'http://localhost:8080/api/v1'
let role: Role = 'MANAGER'
let rows: AttendanceRecord[] = []
let devices: RegisteredDevice[] = []
let queries: URLSearchParams[] = []
let reboundDevices: Array<{ employeeId: string; body: Record<string, unknown> }> = []

function page(items: AttendanceRecord[], index = 0, pages = 1) {
  return { items, page: index, size: 20, totalElements: items.length, totalPages: pages }
}

const server = setupServer(
  http.get(base + '/auth/me', () =>
    HttpResponse.json({ id: 'actor', email: 'manager@example.com', displayName: 'Quản lý', role }),
  ),
  http.get(base + '/attendance-records', ({ request }) => {
    const q = new URL(request.url).searchParams
    queries.push(q)
    const items = rows.filter(
      row =>
        (!q.get('status') || row.status === q.get('status')) &&
        (!q.get('checkType') || row.checkType === q.get('checkType')),
    )
    return HttpResponse.json(page(items))
  }),
  http.get(base + '/attendance-records/devices', () => HttpResponse.json(devices)),
  http.get(base + '/accounts', () =>
    HttpResponse.json({
      items: [
        {
          id: 'emp-1',
          email: 'an@example.com',
          displayName: 'Nguyễn An',
          role: 'EMPLOYEE',
          locked: false,
          position: 'Thu ngân',
          positionId: 'pos-1',
          skills: [],
          managerId: 'actor',
          managerName: 'Quản lý',
          createdAt: '2026-11-01T00:00:00Z',
          version: 0,
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    }),
  ),
  http.put(base + '/attendance-records/devices/:employeeId', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    reboundDevices.push({ employeeId: String(params.employeeId), body })
    const updated: RegisteredDevice = {
      employeeId: String(params.employeeId),
      employeeName: 'Nguyễn An',
      deviceId: String(body.deviceId),
      deviceName: (body.deviceName as string | null) ?? null,
      registeredAt: '2026-11-07T03:00:00Z',
    }
    devices = [updated]
    return HttpResponse.json(updated)
  }),
)

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
})

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-07T03:00:00Z'))
  role = 'MANAGER'
  rows = [
    {
      id: 'att-1',
      employeeId: 'emp-1',
      employeeName: 'Nguyễn An',
      scheduleId: 'sch-1',
      workDate: '2026-11-07',
      shiftName: 'Ca sáng',
      checkType: 'CHECK_IN',
      recordedAt: '2026-11-07T00:58:00Z',
      photoUrl: 'https://example.com/timemark/checkin-an.jpg',
      photoCapturedAt: '2026-11-07T00:57:50Z',
      photoLocation: '268 Lý Thường Kiệt, Quận 10, TP.HCM',
      deviceLocation: '268 Lý Thường Kiệt, Phường 14, Quận 10',
      deviceLatitude: 10.7726,
      deviceLongitude: 106.6579,
      deviceId: 'device-iphone-14',
      deviceName: 'iPhone 14 của An',
      status: 'ON_TIME',
      verificationNote: 'Khớp vị trí và thời gian trên ảnh Timemark',
    },
    {
      id: 'att-2',
      employeeId: 'emp-2',
      employeeName: 'Trần Bình',
      scheduleId: 'sch-2',
      workDate: '2026-11-07',
      shiftName: 'Ca chiều',
      checkType: 'CHECK_IN',
      recordedAt: '2026-11-07T06:20:00Z',
      photoUrl: 'https://example.com/timemark/checkin-binh.jpg',
      photoCapturedAt: '2026-11-07T06:19:00Z',
      photoLocation: '12 Nguyễn Trãi, Quận 1, TP.HCM',
      deviceLocation: '12 Nguyễn Trãi, Phường Bến Thành, Quận 1',
      deviceLatitude: 10.7712,
      deviceLongitude: 106.6934,
      mockLocation: true,
      fraudType: 'FAKE_LOCATION',
      status: 'REJECTED',
      verificationNote: 'Cảnh báo gian lận: Phát hiện dấu hiệu định vị giả (Mock GPS) — đã báo cho quản lý',
    },
  ]
  devices = [
    {
      employeeId: 'emp-1',
      employeeName: 'Nguyễn An',
      deviceId: 'device-iphone-14',
      deviceName: 'iPhone 14 của An',
      registeredAt: '2026-11-07T00:58:00Z',
    },
  ]
  queries = []
  reboundDevices = []
  sessionStorage.clear()
  saveSession({ accessToken: 'test-token', expiresAt: '2026-11-07T05:00:00Z' })
  window.location.hash = '/attendance'
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(() => server.close())

const mount = () =>
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )

it('manager opens attendance list and sees photo, photo location, device location, fraud alerts, and result for each record', async () => {
  mount()
  const user = userEvent.setup()

  expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
  const table = screen.getByRole('table')
  expect(within(table).getByText('268 Lý Thường Kiệt, Quận 10, TP.HCM')).toBeInTheDocument()
  expect(within(table).getByText('268 Lý Thường Kiệt, Phường 14, Quận 10')).toBeInTheDocument()
  expect(within(table).getByText('Tọa độ: 10.7726, 106.6579')).toBeInTheDocument()
  expect(within(table).getByText('Đúng giờ')).toBeInTheDocument()
  expect(within(table).getByText('Cảnh báo: Định vị giả')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Cảnh báo gian lận')

  const img = screen.getByAltText('Ảnh điểm danh Nguyễn An') as HTMLImageElement
  expect(img.src).toContain('https://example.com/timemark/checkin-an.jpg')

  await user.click(screen.getByRole('button', { name: 'Xem chi tiết lượt điểm danh của Nguyễn An' }))
  const dialog = await screen.findByRole('dialog', { name: 'Chi tiết lượt điểm danh' })
  expect(within(dialog).getByText('Khớp vị trí và thời gian trên ảnh Timemark')).toBeInTheDocument()
  expect(within(dialog).getByAltText('Ảnh Timemark của Nguyễn An')).toBeInTheDocument()
})

it('filters attendance records by status and checkType', async () => {
  mount()
  const user = userEvent.setup()

  await screen.findByText('Nguyễn An')
  await user.selectOptions(screen.getByLabelText('Kết quả'), 'REJECTED')
  await waitFor(() => expect(queries.at(-1)?.get('status')).toBe('REJECTED'))
  expect(await screen.findByText('Trần Bình')).toBeInTheDocument()
  expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
})

it('allows manager to re-register an employee device when changing phones', async () => {
  mount()
  const user = userEvent.setup()

  await screen.findByText('Nguyễn An')
  await user.click(screen.getByRole('button', { name: 'Thiết bị đăng ký' }))
  const dialog = await screen.findByRole('dialog', { name: 'Thiết bị điểm danh đã đăng ký' })
  expect(await within(dialog).findByText('device-iphone-14')).toBeInTheDocument()

  await user.type(within(dialog).getByLabelText('Mã thiết bị mới'), 'device-samsung-s24')
  await user.type(within(dialog).getByLabelText('Tên thiết bị'), 'Samsung S24 mới')
  await user.click(within(dialog).getByRole('button', { name: 'Đăng ký lại thiết bị' }))

  await waitFor(() =>
    expect(reboundDevices).toEqual([
      {
        employeeId: 'emp-1',
        body: { deviceId: 'device-samsung-s24', deviceName: 'Samsung S24 mới' },
      },
    ]),
  )
  expect(await within(dialog).findByText('device-samsung-s24')).toBeInTheDocument()
})
