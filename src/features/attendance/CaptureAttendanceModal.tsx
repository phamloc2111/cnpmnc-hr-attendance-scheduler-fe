import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { instantLabel } from '../../shared/utils/dates'
import type { WorkSchedule } from '../schedule'
import { sendAttendance } from './api'
import type { AttendanceEvent, AttendanceType } from './types'
import { capturePhoto, freshLocation } from './capture'
import './capture.css'

export function CaptureAttendanceModal({ shift, type, onClose, onSaved }: {
  shift: WorkSchedule; type: AttendanceType; onClose: () => void; onSaved: (event: AttendanceEvent) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const mounted = useRef(false)
  const submitting = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, retry] = useState(0)
  useEffect(() => {
    let active = true; mounted.current = true; setReady(false); setError('')
    if (!navigator.mediaDevices?.getUserMedia) setError('Không mở được camera. Hãy dùng trình duyệt hỗ trợ camera qua HTTPS hoặc localhost.')
    else navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(camera => {
        if (!active) { camera.getTracks().forEach(track => track.stop()); return }
        stream.current = camera
        if (video.current) video.current.srcObject = camera
      }).catch((failure: unknown) => {
        if (active) setError(failure instanceof DOMException && failure.name === 'NotAllowedError'
          ? 'Bạn chưa cho phép camera. Hãy cấp quyền camera để chụp ảnh mới; không thể chọn ảnh từ thư viện.'
          : 'Không mở được camera. Kiểm tra thiết bị và thử lại.')
      })
    return () => { active = false; mounted.current = false; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null }
  }, [attempt])
  async function submit() {
    if (submitting.current || !video.current || !ready) return
    submitting.current = true; setBusy(true); setError('')
    try {
      const position = await freshLocation()
      if (!mounted.current || !video.current) return
      const { photo, capturedAt } = await capturePhoto(video.current, position)
      const event = await sendAttendance(shift.id, type, photo, capturedAt, position)
      if (mounted.current) onSaved(event)
    } catch (failure: unknown) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Không gửi được ảnh điểm danh.') }
    finally { submitting.current = false; if (mounted.current) setBusy(false) }
  }
  return <Modal title="Điểm danh ca làm" busy={busy} onClose={onClose}>
    <div className="capture-attendance"><h3>{shift.shiftName} · {type === 'CHECK_IN' ? 'Vào ca' : 'Ra ca'}</h3>
      <p>{instantLabel(shift.startsAt)} → {instantLabel(shift.endsAt)}</p>
      <video ref={video} autoPlay muted playsInline aria-label="Camera chụp ảnh điểm danh" onLoadedData={() => setReady(true)} onError={() => { setReady(false); setError('Camera bị gián đoạn. Hãy mở lại camera.') }} />
      <p>Chụp ảnh mới tại nơi làm việc. Thời gian và GPS được ghi trên ảnh ngay lúc gửi.</p>
      {error && <p role="alert">{error}</p>}
      {!ready && !error && <p role="status">Đang mở camera…</p>}
      {busy && <p role="status">Đang lấy GPS, chụp và gửi ảnh. Vui lòng giữ camera ổn định…</p>}
      <div className="modal-actions"><button disabled={busy} onClick={onClose}>Hủy</button>
        {!ready && error && <button disabled={busy} onClick={() => retry(value => value + 1)}>Mở lại camera</button>}
        <button className="primary" disabled={!ready || busy} onClick={() => { void submit() }}>Chụp và điểm danh {type === 'CHECK_IN' ? 'vào' : 'ra'}</button>
      </div>
    </div>
  </Modal>
}
