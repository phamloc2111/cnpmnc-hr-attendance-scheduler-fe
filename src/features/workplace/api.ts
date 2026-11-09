import { request } from '../../shared/api/client'

export type WorkplaceSettings = {
  configured: boolean; latitude: number | null; longitude: number | null
  radiusMeters: number; gpsToleranceMeters: number; version: number
  updatedAt: string | null; updatedBy: string | null
}
export type SaveWorkplace = Pick<WorkplaceSettings, 'radiusMeters' | 'gpsToleranceMeters' | 'version'> & { latitude: number; longitude: number }
export const getWorkplace = () => request<WorkplaceSettings>('/workplace-settings')
export const saveWorkplace = (body: SaveWorkplace) => request<WorkplaceSettings>('/workplace-settings', { method: 'PUT', body: JSON.stringify(body) })

export type WorkplacePlaceSuggestion = { placeId: string; label: string }
export type WorkplacePlace = WorkplacePlaceSuggestion & { latitude: number; longitude: number }
export const searchWorkplacePlaces = (query: string, signal: AbortSignal) =>
  request<WorkplacePlaceSuggestion[]>('/workplace-settings/places?' + new URLSearchParams({ q: query }), { signal })
export const getWorkplacePlace = (placeId: string, signal: AbortSignal) =>
  request<WorkplacePlace>('/workplace-settings/places/detail?' + new URLSearchParams({ placeId }), { signal })
