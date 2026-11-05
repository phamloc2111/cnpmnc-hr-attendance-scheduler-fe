import { request } from '../../shared/api/client'
export type Position = { id: string; name: string; active: boolean; version: number }
export type PositionPage = { items: Position[]; page: number; totalPages: number; totalElements: number }
export function listPositions(page = 0, active = '', q = '') {
  const query = new URLSearchParams({ page: String(page), size: '20', q })
  if (active) query.set('active', active)
  return request<PositionPage>('/positions?' + query)
}
export const getPosition = (id: string) => request<Position>('/positions/' + id)
export const createPosition = (name: string) => request<Position>('/positions', { method: 'POST', body: JSON.stringify({ name }) })
export const setPositionStatus = (position: Position) => request<Position>('/positions/' + position.id + '/status', { method: 'PATCH', body: JSON.stringify({ active: !position.active, version: position.version }) })
