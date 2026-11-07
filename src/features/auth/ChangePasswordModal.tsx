import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../shared/components/Modal'
import { useAuth } from './AuthProvider'

export function ChangePasswordModal({ onClose, onSaved }: {
  onClose: () => void; onSaved: () => void
}) {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" autoFocus required maxLength={72} value={currentPassword} disabled={busy} onChange={event => setCurrentPassword(event.target.value)} />
      <label htmlFor="new-password">Mật khẩu mới</label>
      <input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={newPassword} disabled={busy} onChange={event => setNewPassword(event.target.value)} />
      <small className="muted">Ít nhất 8 ký tự, tối đa 72 byte UTF-8.</small>
      <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
      <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={72} value={confirmPassword} disabled={busy} onChange={event => setConfirmPassword(event.target.value)} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" disabled={busy} onClick={onClose}>Hủy</button>
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  </Modal>
}
