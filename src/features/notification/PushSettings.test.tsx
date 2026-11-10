import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { PushSettings } from './PushSettings'
import { PushBridge } from './PushBridge'
import { connectPush, disconnectPush, storedDevice } from './push'
import { writeBinding } from './binding'
import * as sdk from './sdk'

vi.mock('./firebase-config', () => ({ firebaseConfigured: true }))
vi.mock('./binding', () => ({ writeBinding: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./sdk', () => ({ registerToken: vi.fn(), unregisterToken: vi.fn(), listen: vi.fn() }))
const base = 'http://localhost:8080/api/v1'
let writes: string[], deletes: string[], tests: number
let messageListener: ((payload: unknown) => void) | undefined
const permission = vi.fn<() => Promise<NotificationPermission>>()
const descriptors = {
  notification: Object.getOwnPropertyDescriptor(window, 'Notification'), secure: Object.getOwnPropertyDescriptor(window, 'isSecureContext'),
  push: Object.getOwnPropertyDescriptor(window, 'PushManager'), sw: Object.getOwnPropertyDescriptor(navigator, 'serviceWorker'),
  agent: Object.getOwnPropertyDescriptor(navigator, 'userAgent'),
}
const server = setupServer(
  http.get(base + '/notifications/config', () => HttpResponse.json({ enabled: true, reminderTimes: ['08:00', '15:00', '20:00'], timezone: 'Asia/Ho_Chi_Minh' })),
  http.put(base + '/notifications/devices', async ({ request }) => { writes.push((await request.json() as { token: string }).token); return new HttpResponse(null, { status: 204 }) }),
  http.delete(base + '/notifications/devices', async ({ request }) => { deletes.push((await request.json() as { token: string }).token); return new HttpResponse(null, { status: 204 }) }),
  http.post(base + '/notifications/test', () => { tests++; return new HttpResponse(null, { status: 204 }) }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  writes = []; deletes = []; tests = 0; messageListener = undefined; localStorage.clear(); vi.clearAllMocks()
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission: permission } })
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
  permission.mockImplementation(async () => { Object.defineProperty(Notification, 'permission', { configurable: true, value: 'granted' }); return 'granted' })
  vi.mocked(sdk.registerToken).mockResolvedValue('fake-device-token')
  vi.mocked(sdk.unregisterToken).mockResolvedValue(true)
  vi.mocked(sdk.listen).mockImplementation(async listener => { messageListener = listener; return () => {} })
})
afterEach(() => {
  server.resetHandlers(); localStorage.clear()
  for (const [target, key, descriptor] of [[window, 'Notification', descriptors.notification], [window, 'isSecureContext', descriptors.secure], [window, 'PushManager', descriptors.push], [navigator, 'serviceWorker', descriptors.sw], [navigator, 'userAgent', descriptors.agent]] as const) {
    if (descriptor) Object.defineProperty(target, key, descriptor); else Reflect.deleteProperty(target, key)
  }
})
afterAll(() => server.close())
it('asks permission only on an explicit click and binds the token to the signed-in employee', async () => {
  render(<PushSettings employeeId="employee-a" />)
  const button = await screen.findByRole('button', { name: 'Bật thông báo' })
  await waitFor(() => expect(button).toBeEnabled())
  expect(permission).not.toHaveBeenCalled(); expect(sdk.registerToken).not.toHaveBeenCalled()
  fireEvent.click(button)
  expect(permission).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('status')).toHaveTextContent('Đã bật')
  expect(writes).toEqual(['fake-device-token']); expect(writeBinding).toHaveBeenCalledWith('employee-a')
  expect(storedDevice()?.employeeId).toBe('employee-a')
})
it('does not register a device when permission is dismissed', async () => {
  permission.mockResolvedValue('default'); render(<PushSettings employeeId="employee-a" />)
  const button = screen.getByRole('button', { name: 'Bật thông báo' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button)
  expect(await screen.findByRole('alert')).toHaveTextContent('chưa cho phép')
  expect(writes).toHaveLength(0); expect(sdk.registerToken).not.toHaveBeenCalled()
})
it('explains blocked notification permission without repeatedly prompting', async () => {
  Object.defineProperty(Notification, 'permission', { configurable: true, value: 'denied' })
  render(<PushSettings employeeId="employee-a" />)
  expect(screen.getByText(/Thông báo đã bị chặn/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bật thông báo' })).toBeDisabled(); expect(permission).not.toHaveBeenCalled()
})
it('instructs iOS users to install the home-screen web app before requesting permission', () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'iPhone Safari' })
  render(<PushSettings employeeId="employee-a" />)
  expect(screen.getByText(/Thêm vào Màn hình chính/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bật thông báo' })).toBeDisabled(); expect(permission).not.toHaveBeenCalled()
})
it('explains insecure and unsupported browsers without breaking registration', () => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
  render(<PushSettings employeeId="employee-a" />)
  expect(screen.getByText(/cần HTTPS/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bật thông báo' })).toBeDisabled()
})
it('keeps push disabled while the backend is unconfigured', async () => {
  server.use(http.get(base + '/notifications/config', () => HttpResponse.json({ enabled: false, reminderTimes: ['08:00', '15:00', '20:00'], timezone: 'Asia/Ho_Chi_Minh' })))
  render(<PushSettings employeeId="employee-a" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('chưa được cấu hình')
  expect(screen.getByText(/08:00, 15:00, 20:00/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bật thông báo' })).toBeDisabled()
})
it('does not retain an enabled preference if binding fails at the backend', async () => {
  server.use(http.put(base + '/notifications/devices', () => HttpResponse.json({ message: 'Không thể đăng ký thiết bị.' }, { status: 503 })))
  render(<PushSettings employeeId="employee-a" />)
  const button = screen.getByRole('button', { name: 'Bật thông báo' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đăng ký')
  expect(storedDevice()).toBeNull(); expect(writeBinding).toHaveBeenLastCalledWith(null)
})
it('tests only the subscribed device and can turn off the local consent', async () => {
  localStorage.setItem('shiftsync.push-device', JSON.stringify({ employeeId: 'employee-a', token: 'existing-token' }))
  const user = userEvent.setup(); render(<PushSettings employeeId="employee-a" />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi thử' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Gửi thử' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi yêu cầu thử'); expect(tests).toBe(1)
  await user.click(screen.getByRole('button', { name: 'Tắt thông báo' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Đã tắt')
  expect(deletes).toEqual(['existing-token']); expect(storedDevice()).toBeNull(); expect(sdk.unregisterToken).toHaveBeenCalled()
})
it('starts the foreground listener immediately after first enabling push', async () => {
  render(<><PushBridge employeeId="employee-a" /><PushSettings employeeId="employee-a" /></>)
  const button = screen.getByRole('button', { name: 'Bật thông báo' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button)
  await waitFor(() => expect(messageListener).toBeDefined())
  act(() => messageListener?.({ data: { employeeId: 'employee-a', title: 'Cổng đăng ký đã mở', body: 'Hãy chọn ca', weekStart: '2026-11-16', tag: 'registration-open', expiresAt: new Date(Date.now() + 60000).toISOString() } }))
  expect(await screen.findByText('Cổng đăng ký đã mở')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Đăng ký ca ngay →' })).toHaveAttribute('href', '/?registrationWeek=2026-11-16#/registrations')
  act(() => messageListener?.({ data: { employeeId: 'employee-b', title: 'Thông báo người khác', body: 'Không được hiện', weekStart: '2026-11-16', tag: 'another', expiresAt: new Date(Date.now() + 60000).toISOString() } }))
  expect(screen.queryByText('Thông báo người khác')).not.toBeInTheDocument()
})
it('removes the previous browser binding on account switch instead of silently opting in a different employee', async () => {
  localStorage.setItem('shiftsync.push-device', JSON.stringify({ employeeId: 'employee-a', token: 'old-token' }))
  render(<PushBridge employeeId="employee-b" />)
  await waitFor(() => expect(storedDevice()).toBeNull())
  expect(sdk.registerToken).not.toHaveBeenCalled(); expect(writeBinding).toHaveBeenCalledWith(null)
})
it('does not resurrect a preference when token creation finishes after logout', async () => {
  let finish: ((token: string) => void) | undefined
  vi.mocked(sdk.registerToken).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const pending = connectPush('employee-a')
  const result = expect(pending).rejects.toThrow('Đã hủy')
  await waitFor(() => expect(finish).toBeDefined())
  await disconnectPush(); finish?.('too-late-token'); await result
  expect(storedDevice()).toBeNull(); expect(writes).toHaveLength(0)
})
