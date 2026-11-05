export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
export type User = { id: string; email: string; displayName: string; role: Role }
export type Session = { accessToken: string; expiresAt: string }
export type LoginResponse = Session & { tokenType: 'Bearer'; user: User }
export const roleLabels: Record<Role, string> = { EMPLOYEE: 'Nhân viên', MANAGER: 'Quản lý', ADMIN: 'Quản trị' }
export const homePaths: Record<Role, string> = { EMPLOYEE: '/employee', MANAGER: '/management', ADMIN: '/administration' }
