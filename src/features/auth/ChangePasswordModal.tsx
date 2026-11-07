import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../shared/components/Modal'
import { useAuth } from './AuthProvider'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function ChangePasswordModal({ onClose, onSaved }: {
  onClose: () => void; onSaved: () => void
}) {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!currentPassword) {
      setError('Vui lòng nhập mật khẩu cũ')
      return
    }
    if (!newPassword.trim() || newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự và tối đa 72 byte UTF-8')
      return
    }
    if (confirmPassword && confirmPassword !== newPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onSaved()
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không thể đổi mật khẩu')
    } finally {
      setBusy(false)
    }
  }

  return <Modal title="Đổi mật khẩu" busy={busy} onClose={onClose}>
    <form noValidate onSubmit={submit}>
      <label htmlFor="current-password">Mật khẩu cũ</label>
      <div className="password-field">
        <input id="current-password" name="currentPassword" type={showCurrent ? 'text' : 'password'} autoComplete="current-password" autoFocus required maxLength={72} value={currentPassword} disabled={busy} onChange={event => setCurrentPassword(event.target.value)} />
        <button type="button" className="text-button" onClick={() => setShowCurrent(value => !value)} aria-label={showCurrent ? 'Ẩn mật khẩu cũ' : 'Hiện mật khẩu cũ'} title={showCurrent ? 'Ẩn mật khẩu cũ' : 'Hiện mật khẩu cũ'}>
          <EyeIcon open={showCurrent} />
        </button>
      </div>
      <label htmlFor="new-password">Mật khẩu mới</label>
      <div className="password-field">
        <input id="new-password" name="newPassword" type={showNew ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={newPassword} disabled={busy} onChange={event => setNewPassword(event.target.value)} />
        <button type="button" className="text-button" onClick={() => setShowNew(value => !value)} aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'} title={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}>
          <EyeIcon open={showNew} />
        </button>
      </div>
      <small className="muted">Ít nhất 8 ký tự, tối đa 72 byte UTF-8.</small>
      <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
      <div className="password-field">
        <input id="confirm-password" name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" maxLength={72} value={confirmPassword} disabled={busy} onChange={event => setConfirmPassword(event.target.value)} />
        <button type="button" className="text-button" onClick={() => setShowConfirm(value => !value)} aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'} title={showConfirm ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'}>
          <EyeIcon open={showConfirm} />
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" disabled={busy} onClick={onClose}>Hủy</button>
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  </Modal>
}
