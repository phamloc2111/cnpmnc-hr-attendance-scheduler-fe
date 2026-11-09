import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { WorkplacePage } from './WorkplacePage'
import { App } from '../../app/App'
import { AuthProvider } from '../auth/AuthProvider'
import { saveSession } from '../../shared/api/client'
import type { SaveWorkplace, WorkplaceSettings } from './api'

const base = 'http://localhost:8080/api/v1'
let settings: WorkplaceSettings
let writes: SaveWorkplace[] = [], reads = 0
const server = setupServer(
  http.get(base + '/workplace-settings', () => { reads++; return HttpResponse.json(settings) }),
  http.put(base + '/workplace-settings', async ({ request }) => {
    const body = await request.json() as SaveWorkplace; writes.push(body)
    settings = { ...body, configured: true, version: body.version + 1, updatedAt: '2026-11-09T03:00:00Z', updatedBy: 'manager' }
    return HttpResponse.json(settings)
  }),
  http.get(base + '/auth/me', () => HttpResponse.json({ id: 'employee', displayName: 'An', email: 'employee@example.com', role: 'EMPLOYEE' })),
)
const geolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation')
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  settings = { configured: false, latitude: null, longitude: null, radiusMeters: 100, gpsToleranceMeters: 30, version: 0, updatedAt: null, updatedBy: null }
  writes = []; reads = 0
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); if (geolocation) Object.defineProperty(navigator, 'geolocation', geolocation); else Reflect.deleteProperty(navigator, 'geolocation') })
afterAll(() => server.close())
function coordinates() {
  fireEvent.change(screen.getByLabelText('Vĩ độ'), { target: { value: '10.7726' } })
  fireEvent.change(screen.getByLabelText('Kinh độ'), { target: { value: '106.6579' } })
}
it('shows unconfigured settings without a 404 and saves coordinates with the default tolerance', async () => {
  render(<WorkplacePage />)
  expect(await screen.findByText('Chưa thiết lập điểm làm việc')).toBeInTheDocument()
  expect(screen.getByLabelText('Vĩ độ')).toHaveValue(null)
  expect(screen.getByLabelText('Dung sai GPS (m)')).toHaveValue(30)
  coordinates()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
  expect(await screen.findByText(/Đã lưu cấu hình/)).toBeInTheDocument()
  expect(writes).toEqual([{ latitude: 10.7726, longitude: 106.6579, radiusMeters: 100, gpsToleranceMeters: 30, version: 0 }])
  fireEvent.change(screen.getByLabelText('Dung sai GPS (m)'), { target: { value: '50' } })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
  await waitFor(() => expect(writes).toHaveLength(2))
  expect(writes[1].version).toBe(1)
  expect(screen.getByText('100m bán kính + 50m dung sai GPS')).toBeInTheDocument()
})
it.each(['19', '51'])('rejects GPS tolerance %s before submitting', async value => {
  render(<WorkplacePage />); await screen.findByLabelText('Vĩ độ'); coordinates()
  fireEvent.change(screen.getByLabelText('Dung sai GPS (m)'), { target: { value } })
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('20–50m')
  expect(writes).toHaveLength(0)
})
it('obtains fresh GPS coordinates only when requested and does not auto-save them', async () => {
  const locate = vi.fn((success: PositionCallback) => success({ coords: { latitude: 10.7726, longitude: 106.6579, accuracy: 25 } } as GeolocationPosition))
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: locate } })
  render(<WorkplacePage />); await screen.findByLabelText('Vĩ độ')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lấy vị trí hiện tại' }))
  expect(locate).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  expect(screen.getByLabelText('Vĩ độ')).toHaveValue(10.7726)
  expect(screen.getByText(/Sai số vị trí vừa lấy: ±25m/)).toBeInTheDocument()
  expect(writes).toHaveLength(0)
})
it('explains denied location permission and leaves manual coordinates editable', async () => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } })
  render(<WorkplacePage />); await screen.findByLabelText('Vĩ độ')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lấy vị trí hiện tại' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn chưa cho phép định vị')
  expect(screen.getByLabelText('Vĩ độ')).toBeEnabled()
  expect(writes).toHaveLength(0)
})
it('preserves unsaved inputs on a concurrent update conflict and offers explicit reload', async () => {
  server.use(http.put(base + '/workplace-settings', () => HttpResponse.json({ message: 'Cấu hình vừa được người khác thay đổi. Hãy tải lại trước khi lưu.' }, { status: 409 })))
  render(<WorkplacePage />); await screen.findByLabelText('Vĩ độ'); coordinates()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Hãy tải lại')
  expect(screen.getByLabelText('Vĩ độ')).toHaveValue(10.7726)
  settings = { ...settings, configured: true, latitude: 11, longitude: 107, version: 1 }
  await userEvent.setup().click(screen.getByRole('button', { name: 'Tải lại' }))
  await waitFor(() => expect(screen.getByLabelText('Vĩ độ')).toHaveValue(11))
})
it('retries load failures without showing a blank editable configuration', async () => {
  server.use(http.get(base + '/workplace-settings', () => HttpResponse.json({ message: 'Mất kết nối cấu hình' }, { status: 503 })))
  render(<WorkplacePage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối cấu hình')
  expect(screen.queryByRole('button', { name: 'Lưu cấu hình' })).not.toBeInTheDocument()
  server.resetHandlers(); await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByLabelText('Vĩ độ')).toBeInTheDocument()
})
it('denies employees access without requesting workplace settings', async () => {
  saveSession({ accessToken: 'test-token', expiresAt: new Date(Date.now() + 3600000).toISOString() }); window.location.hash = '/workplace'
  render(<AuthProvider><App /></AuthProvider>)
  expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
  expect(reads).toBe(0)
  expect(screen.queryByRole('link', { name: 'Điểm làm việc' })).not.toBeInTheDocument()
})
