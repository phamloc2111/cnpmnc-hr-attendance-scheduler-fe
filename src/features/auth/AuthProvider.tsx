import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { clearSession, readSession, request, saveSession } from '../../shared/api/client'
import { disconnectPush } from '../notification'
import type { LoginResponse, User } from './types'

type AuthState = {
  user: User | null; loading: boolean; restoreError: string
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>; retry: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}
const AuthContext = createContext<AuthState | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [restoreError, setRestoreError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [expiry, setExpiry] = useState<string | null>(() => readSession()?.expiresAt ?? null)
  useEffect(() => {
    const expire = () => { setUser(null); setExpiry(null); setRestoreError('') }
    window.addEventListener('session-expired', expire)
    return () => window.removeEventListener('session-expired', expire)
  }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setRestoreError('')
    if (!readSession()) { setLoading(false); return }
    request<User>('/auth/me').then(value => { if (active) setUser(value) })
      .catch((error: unknown) => {
        if (active && readSession()) setRestoreError(error instanceof Error ? error.message : 'Không thể xác minh phiên đăng nhập.')
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    if (!expiry) return
    const timer = window.setTimeout(clearSession, Math.max(0, Date.parse(expiry) - Date.now()))
    return () => window.clearTimeout(timer)
  }, [expiry])
  const login = useCallback(async (email: string, password: string) => {
    const response = await request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) }, true)
    saveSession(response)
    setExpiry(response.expiresAt)
    setUser(response.user)
    return response.user
  }, [])
  const logout = useCallback(async () => {
    void disconnectPush()
    try { await request<void>('/auth/logout', { method: 'POST' }) }
    finally { clearSession() }
  }, [])
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }, [])
  return <AuthContext.Provider value={{ user, loading, restoreError, login, logout, changePassword, retry: () => setAttempt(value => value + 1) }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const state = useContext(AuthContext)
  if (!state) throw new Error('AuthProvider is required')
  return state
}
