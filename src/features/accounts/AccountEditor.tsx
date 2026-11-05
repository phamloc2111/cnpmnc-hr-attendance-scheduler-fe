import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../shared/components/Modal'
import { roleLabels } from '../auth'
import type { Role, User } from '../auth'
import { createAccount, updateAccount } from './api'
import { ManagerSelect } from './ManagerSelect'
import type { Account, AccountDetails } from './types'

export function AccountEditor({ actor, account, onClose, onSaved }: {
  actor: User; account: Account | null; onClose: () => void; onSaved: (account: Account) => void
}) {
  const isAdmin = actor.role === 'ADMIN'
  const isSelf = actor.id === account?.id
  const [email, setEmail] = useState(account?.email ?? '')
  const [displayName, setDisplayName] = useState(account?.displayName ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(account?.role ?? 'EMPLOYEE')
  const [position, setPosition] = useState(account?.position ?? '')
  const [skillsText, setSkillsText] = useState(account?.skills.join(', ') ?? '')
  const [managerId, setManagerId] = useState(account?.managerId ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    const skills = role === 'EMPLOYEE' ? skillsText.split(',').map(skill => skill.trim()).filter(Boolean) : []
    if (!displayName.trim()) { setError('Vui lòng nhập họ tên'); return }
    if (skills.length > 20 || skills.some(skill => skill.length > 80)) {
      setError('Tối đa 20 kỹ năng, mỗi kỹ năng tối đa 80 ký tự'); return
    }
    if (new Set(skills.map(skill => skill.toLocaleLowerCase('vi'))).size !== skills.length) {
      setError('Kỹ năng không được trùng nhau'); return
    }
    if (!account && (password.length < 12 || new TextEncoder().encode(password).length > 72)) {
      setError('Mật khẩu phải có ít nhất 12 ký tự và tối đa 72 byte UTF-8'); return
    }
    const details: AccountDetails = {
      email: email.trim(), displayName: displayName.trim(), role,
      position: role === 'EMPLOYEE' ? position.trim() || null : null, skills,
      managerId: isAdmin && role === 'EMPLOYEE' ? managerId || null : null,
    }
    setBusy(true)
    try {
      const result = account ? await updateAccount(account.id, details, account.version)
        : await createAccount(details, password)
      setPassword('')
      onSaved(result)
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không thể lưu tài khoản')
    } finally { setBusy(false) }
  }

  return <Modal title={account ? 'Sửa tài khoản' : 'Tạo tài khoản'} busy={busy} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="form-grid">
        <div><label htmlFor="account-name">Họ tên</label>
          <input id="account-name" autoFocus required maxLength={120} value={displayName} disabled={busy} onChange={event => setDisplayName(event.target.value)} /></div>
        <div><label htmlFor="account-email">Email</label>
          <input id="account-email" type="email" autoComplete="off" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></div>
        {!account && <div className="full-width"><label htmlFor="account-password">Mật khẩu ban đầu</label>
          <input id="account-password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
          <small className="muted">Ít nhất 12 ký tự, tối đa 72 byte UTF-8. Cấp riêng cho người nhận.</small></div>}
        {isAdmin && <div><label htmlFor="account-role">Vai trò</label>
          <select id="account-role" value={role} disabled={busy || isSelf}
            onChange={event => { setRole(event.target.value as Role); setManagerId(''); setPosition(''); setSkillsText('') }}>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>{isSelf && <small className="muted">Không thể tự đổi vai trò.</small>}</div>}
        {role === 'EMPLOYEE' && <><div><label htmlFor="account-position">Vị trí</label>
          <input id="account-position" maxLength={120} value={position} disabled={busy} onChange={event => setPosition(event.target.value)} placeholder="Ví dụ: Thu ngân" /></div>
        <div className="full-width"><label htmlFor="account-skills">Kỹ năng</label>
          <textarea id="account-skills" rows={2} maxLength={1700} value={skillsText} disabled={busy} onChange={event => setSkillsText(event.target.value)} placeholder="Ví dụ: Thu ngân, Pha chế" />
          <small className="muted">Phân tách bằng dấu phẩy. Tối đa 20 kỹ năng.</small></div></>}
        {isAdmin && role === 'EMPLOYEE' && <div className="full-width">
          <ManagerSelect value={managerId} disabled={busy} onChange={setManagerId} />
        </div>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" disabled={busy} onClick={onClose}>Hủy</button>
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : account ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></div>
    </form>
  </Modal>
}
