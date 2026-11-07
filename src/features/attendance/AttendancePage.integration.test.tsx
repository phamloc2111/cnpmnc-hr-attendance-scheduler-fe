import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { saveSession } from '../../shared/api/client'
import { AttendancePage } from './AttendancePage'
import type { WorkSchedule } from '../schedule/types'

const base = 'http://localhost:8080/api/v1'
const now = Date.parse('2026-11-05T01:00:00Z')
const shift: WorkSchedule = {
  id: 'shift-1', employeeId: 'employee-1', employeeName: 'An', shiftTemplateId: 'template-1',
  workDate: '2026-11-05', shiftName: 'Ca sáng', startsAt: '2026-11-05T01:00:00Z',
  endsAt: '2026-11-05T10:00:00Z', breakMinutes: 60, workingMinutes: 480, timezone: 'Asia/Ho_Chi_Minh',
}
let uploads: FormData[] = []
const server = setupServer(
  http.get(base + '/work-schedules', () => HttpResponse.json({ items: [shift], page: 0, size: 20, totalElements: 1, totalPages: 1 })),
  http.get(base + '/attendance/events', () => HttpResponse.json([])),
  http.post(base + '/attendance/events', async ({ request }) => {
    const body = await request.formData(); uploads.push(body)
    return HttpResponse.json({ id: 'event-1', scheduleId: shift.id, type: body.get('type'),
      receivedAt: new Date(now).toISOString(), locatedAt: body.get('locatedAt'),
      latitude: 10, longitude: 106, accuracyMeters: 5, photoUrl: '/api/v1/attendance/events/event-1/photo' }, { status: 201 })
  }),
)
beforeAll(() => server.listen())
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now)
  sessionStorage.clear()
  saveSession({ accessToken: 'test-token', expiresAt: '2026-11-06T00:00:00Z' })
  uploads = []
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())

it('explains denied location and does not upload the photo', async () => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (_ok: unknown, fail: (error: unknown) => void) => fail({ code: 1 }),
  } })
  render(<AttendancePage />)
  const user = userEvent.setup()
  await user.upload(await screen.findByLabelText(/Ảnh Timemark/), new File(['jpeg'], 'timemark.jpg', { type: 'image/jpeg' }))
  await user.click(screen.getByRole('button', { name: 'Điểm danh vào' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('chưa cấp quyền định vị')
  expect(uploads).toHaveLength(0)
})

it('takes a fresh position for the selected library image when sending', async () => {
  const gps = vi.fn((ok: (position: GeolocationPosition) => void) => ok({
    timestamp: now, coords: { latitude: 10, longitude: 106, accuracy: 5 },
  } as GeolocationPosition))
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } })
  render(<AttendancePage />)
  const user = userEvent.setup()
  await user.upload(await screen.findByLabelText(/Ảnh Timemark/), new File(['jpeg'], 'timemark.jpg', { type: 'image/jpeg' }))
  expect(gps).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Điểm danh vào' }))
  await waitFor(() => expect(uploads).toHaveLength(1))
  expect(gps).toHaveBeenCalledOnce()
  expect(gps.mock.calls[0]).toHaveLength(3)
  expect(uploads[0].get('scheduleId')).toBe('shift-1')
  expect(uploads[0].get('type')).toBe('CHECK_IN')
  expect(uploads[0].get('latitude')).toBe('10')
  expect(uploads[0].get('locatedAt')).toBe(new Date(now).toISOString())
  expect((uploads[0].get('photo') as File).type).toBe('image/jpeg')
  expect(await screen.findByText('Đã ghi nhận lượt vào ca.')).toBeInTheDocument()
})
