import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { readBinding } from './src/features/notification/binding'
import { notificationUrl, pushMessage, registrationWeek } from './src/features/notification/payload'

// Existing PWA offline behavior: only a generic page is cached, never API or authenticated HTML.
const cacheName = 'shiftsync-offline-v1'
self.addEventListener('install', event => event.waitUntil(Promise.all([self.skipWaiting(), caches.open(cacheName).then(cache => cache.add('/offline.html'))])))
self.addEventListener('activate', event => event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('shiftsync-offline-') && key !== cacheName).map(key => caches.delete(key))))])))
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && event.request.method === 'GET') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html').then(response => response || Response.error())))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const week = registrationWeek(event.notification.data?.weekStart)
  if (!week) return
  const url = new URL(notificationUrl(week), self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate(url); return existing.focus() }
    return self.clients.openWindow(url)
  }))
})
if (__FIREBASE_CONFIGURED__) {
  const messaging = getMessaging(initializeApp(__FIREBASE_CONFIG__, 'attendance-worker'))
  onBackgroundMessage(messaging, async payload => {
    const message = pushMessage(payload)
    if (!message || await readBinding().catch(() => null) !== message.employeeId) return
    await self.registration.showNotification(message.title, { body: message.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: message.tag, data: { weekStart: message.weekStart } })
  })
}
