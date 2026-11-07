import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { CaptureAttendanceModal } from './CaptureAttendanceModal'
import { capturePhoto, freshLocation } from './capture'
import { saveSession } from '../../shared/api/client'
import type { WorkSchedule } from '../schedule'

vi.mock('./capture', () => ({ capturePhoto: vi.fn(), freshLocation: vi.fn() }))
const shift: WorkSchedule = { id: 'schedule', employeeId: 'employee', employeeName: 'An', shiftTemplateId: 'template', workDate: '2026-11-07', shiftName: 'Ca sáng', startsAt: '2026-11-07T01:00:00Z', endsAt: '2026-11-07T10:00:00Z', breakMinutes: 60, workingMinutes: 480, timezone: 'Asia/Ho_Chi_Minh' }
const position = { timestamp: Date.parse('2026-11-07T01:04:00Z'), coords: { latitude: 10.7726, longitude: 106.6579, accuracy: 5 } } as GeolocationPosition
const stop = vi.fn(), saved = vi.fn()
let uploads: FormData[] = []
const server = setupServer(http.post('http://localhost:8080/api/v1/attendance/events', async ({ request }) => {
  expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
  expect(request.headers.get('authorization')).toBe('Bearer test-token')
  const body = await request.formData(); uploads.push(body)
  return HttpResponse.json({ id: 'event', scheduleId: 'schedule', type: body.get('type'), receivedAt: '2026-11-07T01:04:01Z' }, { status: 201 })
}))
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
})
beforeEach(() => {
  uploads = []; vi.clearAllMocks()
  vi.spyOn(Date, 'now').mockReturnValue(position.timestamp)
  saveSession({ accessToken: 'test-token', expiresAt: '2026-11-08T00:00:00Z' })
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } })
  vi.mocked(freshLocation).mockResolvedValue(position)
  vi.mocked(capturePhoto).mockResolvedValue({ photo: new Blob(['camera-test'], { type: 'image/jpeg' }), capturedAt: '2026-11-07T01:04:00Z' })
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
async function ready() {
  await waitFor(() => expect((screen.getByLabelText('Camera chụp ảnh điểm danh') as HTMLVideoElement).srcObject).toBeTruthy())
  fireEvent.loadedData(screen.getByLabelText('Camera chụp ảnh điểm danh'))
}
it.each(['CHECK_IN', 'CHECK_OUT'] as const)('captures a new photo and fresh location for %s with authenticated multipart upload', async type => {
  const { unmount } = render(<CaptureAttendanceModal shift={shift} type={type} onClose={() => {}} onSaved={saved} />)
  await ready()
  expect(document.querySelector('input[type=file]')).toBeNull()
  await userEvent.setup().click(screen.getByRole('button', { name: type === 'CHECK_IN' ? 'Chụp và điểm danh vào' : 'Chụp và điểm danh ra' }))
  await waitFor(() => expect(saved).toHaveBeenCalledOnce())
  expect(uploads).toHaveLength(1)
  expect(uploads[0].get('scheduleId')).toBe('schedule')
  expect(uploads[0].get('type')).toBe(type)
  expect(uploads[0].get('timemarkCapturedAt')).toBe('2026-11-07T01:04:00Z')
  expect(uploads[0].get('locatedAt')).toBe('2026-11-07T01:04:00.000Z')
  expect(uploads[0].get('latitude')).toBe('10.7726')
  expect(uploads[0].get('photo')).toMatchObject({ size: 11, type: 'image/jpeg' })
  unmount(); expect(stop).toHaveBeenCalledOnce()
})
it('does not capture or upload when GPS permission is denied', async () => {
  vi.mocked(freshLocation).mockRejectedValue(new Error('Bạn chưa cho phép định vị.'))
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)
  await ready(); await userEvent.setup().click(screen.getByRole('button', { name: 'Chụp và điểm danh vào' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn chưa cho phép định vị.')
  expect(capturePhoto).not.toHaveBeenCalled(); expect(uploads).toHaveLength(0); expect(saved).not.toHaveBeenCalled()
})
it('shows camera permission errors and never enables submission', async () => {
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn chưa cho phép camera')
  expect(screen.getByRole('button', { name: 'Chụp và điểm danh vào' })).toBeDisabled()
  expect(uploads).toHaveLength(0)
})
it('keeps the modal open after rejection and allows a new capture on retry', async () => {
  server.use(http.post('http://localhost:8080/api/v1/attendance/events', () => HttpResponse.json({ message: 'Ngoài bán kính điểm làm việc' }, { status: 422 })))
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)
  await ready(); const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Chụp và điểm danh vào' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Ngoài bán kính')
  expect(saved).not.toHaveBeenCalled()
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Chụp và điểm danh vào' }))
  await waitFor(() => expect(saved).toHaveBeenCalledOnce())
  expect(capturePhoto).toHaveBeenCalledTimes(2)
})
