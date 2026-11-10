import { request } from '../../shared/api/client'
import { firebaseConfigured } from './firebase-config'
import { writeBinding } from './binding'

const storageKey = 'shiftsync.push-device'
let generation = 0
export interface PushDevice { employeeId: string; token: string }
export interface PushConfig { enabled: boolean; reminderTime: string; timezone: string }
export function storedDevice(): PushDevice | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (value && typeof value === 'object' && 'employeeId' in value && typeof value.employeeId === 'string' && 'token' in value && typeof value.token === 'string') return { employeeId: value.employeeId, token: value.token }
  } catch { /* Treat damaged browser preferences as disabled. */ }
  return null
}
export function supportProblem() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true)
  if (ios && !standalone) return 'Trên iPhone/iPad (iOS 16.4+), hãy mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính, rồi mở ứng dụng từ đó để bật thông báo.'
  if (!window.isSecureContext) return 'Thông báo cần HTTPS hoặc localhost. Hãy mở địa chỉ HTTPS của ứng dụng.'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'Trình duyệt này chưa hỗ trợ thông báo đẩy. Hãy dùng Chrome Android hoặc ứng dụng đã thêm ra màn hình chính trên iOS 16.4+.'
  return ''
}
export const loadPushConfig = (signal?: AbortSignal) => request<PushConfig>('/notifications/config', { signal })
export async function connectPush(employeeId: string) {
  const current = generation
  const sdk = await import('./sdk')
  const token = await sdk.registerToken()
  if (current !== generation) throw new Error('Đã hủy thiết lập thông báo.')
  if (!token) throw new Error('Không lấy được mã nhận thông báo. Hãy thử lại.')
  // Bind before registration so a concurrently delivered notification has a known recipient.
  await writeBinding(employeeId)
  try { await request<void>('/notifications/devices', { method: 'PUT', body: JSON.stringify({ token }) }) }
  catch (failure: unknown) { await writeBinding(null); throw failure }
  if (current !== generation) throw new Error('Đã hủy thiết lập thông báo.')
  const previous = storedDevice()
  localStorage.setItem(storageKey, JSON.stringify({ employeeId, token }))
  if (previous?.employeeId !== employeeId || previous?.token !== token) window.dispatchEvent(new Event('push-preference-changed'))
  if (previous?.employeeId === employeeId && previous.token !== token) void request<void>('/notifications/devices', { method: 'DELETE', body: JSON.stringify({ token: previous.token }) }).catch(() => {})
  return token
}
export async function disconnectPush() {
  generation++
  const device = storedDevice(); localStorage.removeItem(storageKey)
  window.dispatchEvent(new Event('push-preference-changed'))
  const tasks: Promise<unknown>[] = [writeBinding(null)]
  if (device) tasks.push(request<void>('/notifications/devices', { method: 'DELETE', body: JSON.stringify({ token: device.token }) }))
  if (firebaseConfigured && 'serviceWorker' in navigator) tasks.push(import('./sdk').then(sdk => sdk.unregisterToken()))
  const results = await Promise.allSettled(tasks)
  return results.every(result => result.status === 'fulfilled')
}
export function testPush(employeeId: string) {
  const device = storedDevice()
  if (!device || device.employeeId !== employeeId) return Promise.reject(new Error('Hãy bật thông báo trên thiết bị này trước.'))
  return request<void>('/notifications/test', { method: 'POST', body: JSON.stringify({ token: device.token }) })
}
