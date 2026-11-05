import { request } from '../../shared/api/client'
import type { Account, AccountDetails, AccountFilters, AccountPage } from './types'

export function listAccounts(filters: AccountFilters, size = 20) {
  const query = new URLSearchParams({ q: filters.q, page: String(filters.page), size: String(size) })
  if (filters.role) query.set('role', filters.role)
  if (filters.locked) query.set('locked', filters.locked)
  return request<AccountPage>('/accounts?' + query)
}
export function getAccount(id: string) {
  return request<Account>('/accounts/' + id)
}
export function createAccount(details: AccountDetails, password: string) {
  return request<Account>('/accounts', { method: 'POST', body: JSON.stringify({ ...details, password }) })
}
export function updateAccount(id: string, details: AccountDetails, version: number) {
  return request<Account>('/accounts/' + id, { method: 'PUT', body: JSON.stringify({ ...details, version }) })
}
export function setAccountLocked(account: Account) {
  return request<Account>('/accounts/' + account.id + '/lock', {
    method: 'PATCH', body: JSON.stringify({ locked: !account.locked, version: account.version }),
  })
}
