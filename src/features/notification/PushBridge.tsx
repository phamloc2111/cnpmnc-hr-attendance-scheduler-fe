import { useEffect, useState } from 'react'
import { firebaseConfigured } from './firebase-config'
import { connectPush, disconnectPush, storedDevice, supportProblem } from './push'
import { notificationUrl, pushMessage } from './payload'
import type { PushMessage } from './payload'
import './notification.css'

export function PushBridge({ employeeId }: { employeeId: string }) {
  const [message, setMessage] = useState<PushMessage | null>(null)
  const [revision, refresh] = useState(0)
  useEffect(() => {
    const update = () => refresh(value => value + 1)
    window.addEventListener('push-preference-changed', update)
    return () => window.removeEventListener('push-preference-changed', update)
  }, [])
  useEffect(() => {
    setMessage(null)
    let active = true, dispose: (() => void) | undefined
    const stored = storedDevice()
    if (stored && stored.employeeId !== employeeId) { void disconnectPush(); return }
    if (!stored || !firebaseConfigured || supportProblem() || Notification.permission !== 'granted') return
    import('./sdk').then(async sdk => {
      if (!active) return
      const unsubscribe = await sdk.listen(payload => { const value = pushMessage(payload); if (active && value?.employeeId === employeeId) setMessage(value) })
      if (active) { dispose = unsubscribe; await connectPush(employeeId) } else unsubscribe()
    }).catch(() => { /* Settings panel provides an explicit retry; do not interrupt attendance. */ })
    return () => { active = false; dispose?.() }
  }, [employeeId, revision])
  return message && <aside className="push-toast" role="status"><div><strong>{message.title}</strong><p>{message.body}</p><a href={notificationUrl(message.weekStart)}>Đăng ký ca ngay →</a></div><button aria-label="Đóng thông báo" onClick={() => setMessage(null)}>×</button></aside>
}
