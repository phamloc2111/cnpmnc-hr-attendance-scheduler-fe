import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import { homePaths } from './types'

export function LoginPage({ notice = '' }: { notice?: string }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try { const user = await login(email, password); window.location.hash = homePaths[user.role] }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'Đăng nhập không thành công.') }
    finally { setBusy(false) }
  }
  return <main className="login-layout">
    <section className="intro"><a className="brand" href="#/login"><span className="brand-mark">S</span> ShiftSync</a>
      <div><p className="eyebrow">CÙNG ĐỘI NGŨ, ĐÚNG NHỊP LÀM VIỆC</p><h1>Mỗi ca làm.<br />Một nhịp kết nối.</h1><p className="intro-copy">Không gian chung cho lịch làm việc và giờ công của đội ngũ.</p>
        <div className="shift-visual" aria-hidden="true"><span>Đội ngũ của bạn</span><div className="visual-bars"><i /><i /><i /><i /><i /></div><small>Sẵn sàng cho ngày làm việc mới</small></div></div>
      <small>Chấm công &amp; xếp lịch làm việc</small></section>
    <section className="login-panel" aria-labelledby="login-title"><div className="login-form"><p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p><h2 id="login-title">Đăng nhập</h2><p className="muted">Sử dụng tài khoản được cấp để tiếp tục.</p>
      {notice && <p className="notice" role="status">{notice}</p>}<form onSubmit={submit}>
        <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} placeholder="ban@congty.vn" />
        <label htmlFor="password">Mật khẩu</label><div className="password-field"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={72} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /><button type="button" className="text-button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? 'Ẩn' : 'Hiện'}</button></div>
        {error && <p className="error" role="alert">{error}</p>}<button className="primary login-submit" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập →'}</button>
      </form><p className="help-text">Cần cấp tài khoản hoặc hỗ trợ đăng nhập?<br />Hãy liên hệ người quản lý của bạn.</p></div></section>
  </main>
}
