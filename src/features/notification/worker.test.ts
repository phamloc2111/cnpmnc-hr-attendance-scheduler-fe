import { beforeEach, expect, it, vi } from 'vitest'
import source from '../../../firebase-worker.js?raw'
import { notificationUrl, pushMessage, registrationWeek } from './payload'

let handlers: Record<string, (event: unknown) => void>
let background: (payload: unknown) => Promise<void>
let owner: string | null
const showNotification = vi.fn(), openWindow = vi.fn(), navigate = vi.fn(), focus = vi.fn()
const matchAll = vi.fn()
beforeEach(() => {
  handlers = {}; owner = 'a'; vi.clearAllMocks()
  matchAll.mockResolvedValue([])
  const worker = { addEventListener: (name: string, listener: (event: unknown) => void) => { handlers[name] = listener }, location: { origin: 'https://hr.example' }, registration: { showNotification }, clients: { matchAll, openWindow } }
  const script = source.replace(/^import .*\r?\n/gm, '')
  new Function('self', 'initializeApp', 'getMessaging', 'onBackgroundMessage', 'readBinding', 'notificationUrl', 'pushMessage', 'registrationWeek', '__FIREBASE_CONFIGURED__', '__FIREBASE_CONFIG__', script)(worker, vi.fn(), vi.fn(), (_messaging: unknown, listener: typeof background) => { background = listener }, () => Promise.resolve(owner), notificationUrl, pushMessage, registrationWeek, true, {})
})
function payload() { return { data: { employeeId: 'a', title: 'Mở đăng ký', body: 'Chọn ca', weekStart: '2026-11-16', expiresAt: new Date(Date.now() + 60000).toISOString(), tag: 'registration-open-2026-11-16' } } }
it('shows one tagged native notification for the bound employee and does not duplicate SDK auto-notifications', async () => {
  await background(payload())
  expect(showNotification).toHaveBeenCalledExactlyOnceWith('Mở đăng ký', expect.objectContaining({ tag: 'registration-open-2026-11-16', data: { weekStart: '2026-11-16' } }))
})
it('discards expired, malformed and different-account messages after logout or switching accounts', async () => {
  owner = null; await background(payload()); owner = 'b'; await background(payload())
  owner = 'a'; const expired = payload(); expired.data.expiresAt = '2000-01-01T00:00:00Z'; await background(expired)
  await background({}); expect(showNotification).not.toHaveBeenCalled()
})
it('opens the exact week on notification click using only the app origin', async () => {
  let pending: Promise<unknown> | undefined
  handlers.notificationclick({ notification: { close: vi.fn(), data: { weekStart: '2026-11-16', url: 'https://evil.example' } }, waitUntil: (promise: Promise<unknown>) => { pending = promise } })
  await pending
  expect(openWindow).toHaveBeenCalledWith('https://hr.example/?registrationWeek=2026-11-16#/registrations')
})
it('focuses and navigates an existing app window instead of opening another tab', async () => {
  matchAll.mockResolvedValue([{ url: 'https://hr.example/#/employee', navigate, focus }])
  let pending: Promise<unknown> | undefined
  handlers.notificationclick({ notification: { close: vi.fn(), data: { weekStart: '2026-11-16' } }, waitUntil: (promise: Promise<unknown>) => { pending = promise } })
  await pending; expect(navigate).toHaveBeenCalledWith('https://hr.example/?registrationWeek=2026-11-16#/registrations'); expect(focus).toHaveBeenCalledOnce(); expect(openWindow).not.toHaveBeenCalled()
})
