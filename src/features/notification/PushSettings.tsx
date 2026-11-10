import { useEffect, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { firebaseConfigured } from './firebase-config'
import { connectPush, disconnectPush, loadPushConfig, storedDevice, supportProblem, testPush } from './push'
import './notification.css'

export function PushSettings({ employeeId }: { employeeId: string }) {
  const [enabled, setEnabled] = useState(() => storedDevice()?.employeeId === employeeId && !!employeeId)
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [reminderTimes, setReminderTimes] = useState(['08:00', '15:00', '20:00'])
  const [attempt, retry] = useState(0)
  const problem = supportProblem()
  const denied = 'Notification' in window && Notification.permission === 'denied'
  useEffect(() => {
    if (problem || !firebaseConfigured || !employeeId) return
    const controller = new AbortController(); setReady(false); setError('')
    loadPushConfig(controller.signal).then(config => {
      if (controller.signal.aborted) return
      setReady(config.enabled); setReminderTimes(config.reminderTimes ?? ['08:00', '15:00', '20:00'])
      if (!config.enabled) setError('Thông báo đẩy chưa được cấu hình trên máy chủ.')
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(message(failure)) })
    return () => controller.abort()
  }, [employeeId, problem, attempt])
  async function enable() {
    if (busy || !ready || denied) return
    // This call must be synchronous with the user's click, particularly on iOS.
    setBusy(true); setError(''); setNotice('')
    try {
      const permission = Notification.requestPermission()
      if (await permission !== 'granted') { setError('Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt trình duyệt.'); return }
      await connectPush(employeeId); setEnabled(true); setNotice('Đã bật lời nhắc đăng ký ca trên thiết bị này.')
    } catch (failure: unknown) { setError(message(failure)) }
    finally { setBusy(false) }
  }
  async function disable() {
    setBusy(true); setError(''); setNotice('')
    const complete = await disconnectPush(); setEnabled(false); setBusy(false)
    if (!complete) setError('Đã tắt nhận trên thiết bị. Chưa xác nhận được việc thu hồi trên máy chủ; hãy kiểm tra kết nối.')
    else setNotice('Đã tắt thông báo trên thiết bị này.')
  }
  async function test() {
    setBusy(true); setError(''); setNotice('')
    try { await testPush(employeeId); setNotice('Đã gửi yêu cầu thử. Kiểm tra thông báo trên thiết bị.') }
    catch (failure: unknown) { setError(message(failure)) }
    finally { setBusy(false) }
  }
  return <div className="push-settings"><strong>Nhắc đăng ký ca</strong><p>Nhận thông báo khi mở cổng Chủ nhật và lúc {reminderTimes.join(', ')} nếu bạn chưa chọn ca. Giờ Việt Nam (UTC+7).</p>
    {problem ? <p>{problem}</p> : !firebaseConfigured ? <p>Thông báo đang chờ cấu hình Firebase. Bạn vẫn có thể đăng ký ca bình thường.</p> : denied ? <p>Thông báo đã bị chặn. Mở cài đặt thông báo của trang trong trình duyệt để cho phép lại.</p> : null}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="push-settings-actions">{enabled ? <><button disabled={busy} onClick={() => { void disable() }}>Tắt thông báo</button><button disabled={busy || !ready || denied} onClick={() => { void test() }}>Gửi thử</button></> : <button disabled={busy || !ready || !!problem || denied || !firebaseConfigured} onClick={() => { void enable() }}>{busy ? 'Đang bật…' : 'Bật thông báo'}</button>}
      {error && !busy && <button onClick={() => retry(value => value + 1)}>Kiểm tra lại</button>}</div>
  </div>
}
function message(failure: unknown) { return failure instanceof ApiError ? failure.message : 'Không thể hoàn tất thiết lập thông báo. Hãy kiểm tra kết nối, cấu hình Firebase và thử lại.' }
