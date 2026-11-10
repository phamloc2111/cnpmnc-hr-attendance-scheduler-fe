import { getApps, initializeApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { firebaseConfig, vapidKey } from './firebase-config'

async function messaging() {
  if (!await isSupported()) throw new Error('Trình duyệt chưa hỗ trợ thông báo đẩy.')
  const app = getApps().find(value => value.name === 'attendance-web-push') ?? initializeApp(firebaseConfig, 'attendance-web-push')
  return getMessaging(app)
}
export async function registerToken() {
  const registration = await navigator.serviceWorker.register('/sw.js')
  const installing = registration.installing ?? registration.waiting
  if (installing && installing.state !== 'activated') await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { installing.removeEventListener('statechange', changed); reject(new Error('Service worker chưa sẵn sàng. Hãy tải lại trang.')) }, 15000)
    function changed() {
      if (installing!.state === 'activated') { window.clearTimeout(timer); installing!.removeEventListener('statechange', changed); resolve() }
      else if (installing!.state === 'redundant') { window.clearTimeout(timer); installing!.removeEventListener('statechange', changed); reject(new Error('Không cập nhật được service worker.')) }
    }
    installing.addEventListener('statechange', changed); changed()
  })
  // ready resolves once an active worker controls the scope; getToken explicitly reuses it.
  const active = registration.active ? registration : await navigator.serviceWorker.ready
  return getToken(await messaging(), { vapidKey, serviceWorkerRegistration: active })
}
export async function unregisterToken() { return deleteToken(await messaging()) }
export async function listen(listener: (payload: unknown) => void) { return onMessage(await messaging(), listener) }
