import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { instantLabel } from '../../shared/utils/dates'
import type { WorkSchedule } from '../schedule'
import { sendAttendance } from './api'
import type { AttendanceEvent, AttendanceType } from './types'
import { validateSelectedPhoto } from './capture'
import './capture.css'

export function CaptureAttendanceModal({ shift, type, onClose, onSaved }: {
  shift: WorkSchedule; type: AttendanceType; onClose: () => void; onSaved: (event: AttendanceEvent) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(false)
  const submitting = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    const selected = event.target.files?.[0]
    if (!selected) {
      setFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      return
    }
    const validationError = validateSelectedPhoto(selected)
    if (validationError) {
      setError(validationError)
      setFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      return
    }
    setFile(selected)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  async function submit() {
    if (submitting.current || !file) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const event = await sendAttendance(shift.id, type, file)
      if (mounted.current) onSaved(event)
    } catch (failure: unknown) {
      if (mounted.current) {
        setError(failure instanceof Error ? failure.message : 'Không gửi được ảnh điểm danh.')
      }
    } finally {
      submitting.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const actionLabel = type === 'CHECK_IN' ? 'Điểm danh vào' : 'Điểm danh ra'

  return (
    <Modal title="Điểm danh ca làm" busy={busy} onClose={onClose}>
      <div className="capture-attendance">
        <h3>{shift.shiftName} · {type === 'CHECK_IN' ? 'Vào ca' : 'Ra ca'}</h3>
        <p>{instantLabel(shift.startsAt)} → {instantLabel(shift.endsAt)}</p>

        <div className="timemark-file-picker">
          <input
            id="timemark-photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Chọn ảnh Timemark"
            disabled={busy}
            onChange={handleFileChange}
          />
          {file && (
            <p className="selected-file-name">
              Đã chọn: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </div>

        {previewUrl && (
          <div className="preview-container">
            <img src={previewUrl} alt="Xem trước ảnh Timemark" className="photo-preview" />
          </div>
        )}

        <p>Chọn ảnh gốc đã xuất từ ứng dụng Timemark (JPEG, PNG hoặc WEBP, tối đa 5 MB). Hệ thống sẽ tự động đối chiếu thời gian và tọa độ GPS trên ảnh với điểm làm việc.</p>

        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">Đang tải và xác minh ảnh Timemark…</p>}

        <div className="modal-actions">
          <button disabled={busy} onClick={onClose}>Hủy</button>
          <button
            className="primary"
            disabled={!file || busy}
            onClick={() => { void submit() }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
