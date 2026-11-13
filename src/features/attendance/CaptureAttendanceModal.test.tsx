import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { CaptureAttendanceModal } from './CaptureAttendanceModal'
import { saveSession } from '../../shared/api/client'
import type { WorkSchedule } from '../schedule'

const shift: WorkSchedule = {
  id: 'schedule-1',
  employeeId: 'employee-1',
  employeeName: 'Nguyễn An',
  shiftTemplateId: 'template-1',
  workDate: '2026-11-07',
  shiftName: 'Ca sáng',
  startsAt: '2026-11-07T01:00:00Z',
  endsAt: '2026-11-07T10:00:00Z',
  breakMinutes: 60,
  workingMinutes: 480,
  timezone: 'Asia/Ho_Chi_Minh',
}

const saved = vi.fn()
let uploads: { scheduleId: string | null; type: string | null; photo: unknown; keys: string[] }[] = []

let capturedBodies: FormData[] = []

const server = setupServer(
  http.post('http://localhost:8080/api/v1/attendance/events', async ({ request }) => {
    expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    expect(request.headers.get('authorization')).toBe('Bearer test-token')
    return HttpResponse.json(
      { id: 'event-1', scheduleId: 'schedule-1', type: 'CHECK_IN', receivedAt: '2026-11-07T01:04:01Z' },
      { status: 201 }
    )
  })
)

beforeAll(() => {
  server.listen()
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
  globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-preview')
  globalThis.URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  capturedBodies = []
  vi.clearAllMocks()
  saveSession({ accessToken: 'test-token', expiresAt: new Date(Date.now() + 86400000).toISOString() })

  const originalFetch = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (init?.body instanceof FormData) {
      capturedBodies.push(init.body)
    }
    return originalFetch(input, init)
  })
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(() => server.close())

it.each(['CHECK_IN', 'CHECK_OUT'] as const)(
  'allows selecting original Timemark photo and uploads only scheduleId, type, photo for %s',
  async type => {
    render(<CaptureAttendanceModal shift={shift} type={type} onClose={() => {}} onSaved={saved} />)

    const actionButton = screen.getByRole('button', { name: type === 'CHECK_IN' ? 'Điểm danh vào' : 'Điểm danh ra' })
    expect(actionButton).toBeDisabled()

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2])], 'timemark_20261107.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Chọn ảnh Timemark')
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText(/timemark_20261107\.jpg/)).toBeInTheDocument()
    expect(actionButton).toBeEnabled()

    fireEvent.click(actionButton)
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())

    expect(capturedBodies).toHaveLength(1)
    const body = capturedBodies[0]
    expect(body.get('scheduleId')).toBe('schedule-1')
    expect(body.get('type')).toBe(type)
    const photo = body.get('photo') as File
    expect(photo).toBeTruthy()
    expect(photo.name).toBe('timemark_20261107.jpg')
    expect(photo.size).toBe(file.size)

    // Assert that client-side GPS and timestamps are NOT sent
    expect(body.get('locatedAt')).toBeNull()
    expect(body.get('latitude')).toBeNull()
    expect(body.get('longitude')).toBeNull()
    expect(body.get('accuracyMeters')).toBeNull()
    expect(body.get('timemarkCapturedAt')).toBeNull()
    expect(body.get('timemarkLatitude')).toBeNull()
    expect(body.get('timemarkLongitude')).toBeNull()
  }
)

it('rejects unsupported file type on client side and prevents submission', async () => {
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)

  const invalidFile = new File(['gif-data'], 'photo.gif', { type: 'image/gif' })
  const input = screen.getByLabelText('Chọn ảnh Timemark')
  fireEvent.change(input, { target: { files: [invalidFile] } })

  expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WEBP.')
  expect(screen.getByRole('button', { name: 'Điểm danh vào' })).toBeDisabled()
  expect(uploads).toHaveLength(0)
  expect(saved).not.toHaveBeenCalled()
})

it('rejects a file labeled JPEG whose bytes are not an image before uploading', async () => {
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)
  const input = screen.getByLabelText('Chọn ảnh Timemark')
  fireEvent.change(input, { target: { files: [new File(['not a JPEG'], 'photo.jpg', { type: 'image/jpeg' })] } })
  fireEvent.click(screen.getByRole('button', { name: 'Điểm danh vào' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('không khớp định dạng')
  expect(capturedBodies).toHaveLength(0)
  expect(saved).not.toHaveBeenCalled()
})

it('shows the backend reason when a multipart upload is rejected with 400', async () => {
  server.use(http.post('http://localhost:8080/api/v1/attendance/events', () =>
    HttpResponse.json({ code: 'INVALID_ATTENDANCE', message: 'Ảnh Timemark không hợp lệ.' }, { status: 400 })))
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)
  fireEvent.change(screen.getByLabelText('Chọn ảnh Timemark'), { target: {
    files: [new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1])], 'timemark.jpg', { type: 'image/jpeg' })],
  } })
  fireEvent.click(screen.getByRole('button', { name: 'Điểm danh vào' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh Timemark không hợp lệ.')
  expect(saved).not.toHaveBeenCalled()
})

it('rejects file larger than 5 MB on client side', async () => {
  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)

  const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 10)], 'huge.jpg', { type: 'image/jpeg' })
  const input = screen.getByLabelText('Chọn ảnh Timemark')
  fireEvent.change(input, { target: { files: [bigFile] } })

  expect(await screen.findByRole('alert')).toHaveTextContent('vượt quá 5 MB')
  expect(screen.getByRole('button', { name: 'Điểm danh vào' })).toBeDisabled()
  expect(uploads).toHaveLength(0)
})

it('keeps modal open after backend rejection and allows retry with new photo', async () => {
  server.use(
    http.post('http://localhost:8080/api/v1/attendance/events', () =>
      HttpResponse.json({ code: 'ATTENDANCE_VERIFICATION_FAILED', message: 'Vị trí trên ảnh Timemark nằm ngoài vùng điểm danh' }, { status: 422 })
    )
  )

  render(<CaptureAttendanceModal shift={shift} type="CHECK_IN" onClose={() => {}} onSaved={saved} />)

  const file1 = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1])], 'outside.jpg', { type: 'image/jpeg' })
  const input = screen.getByLabelText('Chọn ảnh Timemark')
  fireEvent.change(input, { target: { files: [file1] } })

  fireEvent.click(screen.getByRole('button', { name: 'Điểm danh vào' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('nằm ngoài vùng điểm danh')
  expect(saved).not.toHaveBeenCalled()

  // Reset handler to succeed on retry
  server.resetHandlers()

  const file2 = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 2])], 'valid.jpg', { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file2] } })
  fireEvent.click(screen.getByRole('button', { name: 'Điểm danh vào' }))

  await waitFor(() => expect(saved).toHaveBeenCalledOnce())
})
