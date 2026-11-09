import { request } from '../../shared/api/client'

export type WorkplaceSettings = {
  configured: boolean; latitude: number | null; longitude: number | null
  radiusMeters: number; gpsToleranceMeters: number; version: number
  updatedAt: string | null; updatedBy: string | null
}
export type SaveWorkplace = Pick<WorkplaceSettings, 'radiusMeters' | 'gpsToleranceMeters' | 'version'> & { latitude: number; longitude: number }
export const getWorkplace = () => request<WorkplaceSettings>('/workplace-settings')
export const saveWorkplace = (body: SaveWorkplace) => request<WorkplaceSettings>('/workplace-settings', { method: 'PUT', body: JSON.stringify(body) })
