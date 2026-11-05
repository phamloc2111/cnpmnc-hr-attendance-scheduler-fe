import type { Role } from '../auth'

export type Account = {
  id: string
  email: string
  displayName: string
  role: Role
  locked: boolean
  position: string | null
  skills: string[]
  managerId: string | null
  version: number
}
export type AccountPage = { items: Account[]; page: number; size: number; totalElements: number; totalPages: number }
export type AccountDetails = {
  email: string; displayName: string; role: Role; position: string | null; skills: string[]; managerId: string | null
}
export type AccountFilters = { q: string; role: '' | Role; locked: '' | 'true' | 'false'; page: number }
