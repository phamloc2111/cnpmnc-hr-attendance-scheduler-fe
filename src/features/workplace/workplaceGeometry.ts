import type { AreaData } from '@goongmaps/goong-js'

export type Coordinates = { latitude: number; longitude: number }
const earthRadius = 6371000
const radians = Math.PI / 180

// Destination points on a sphere: the displayed radius is in metres, not screen pixels.
function ring(position: Coordinates, meters: number): number[][] {
  const latitude = position.latitude * radians, longitude = position.longitude * radians
  const distance = meters / earthRadius
  const points: number[][] = []
  for (let index = 0; index < 64; index++) {
    const bearing = index * 2 * Math.PI / 64
    const lat = Math.asin(Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing))
    const lon = longitude + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude), Math.cos(distance) - Math.sin(latitude) * Math.sin(lat))
    points.push([((lon / radians + 540) % 360) - 180, lat / radians])
  }
  points.push([...points[0]])
  return points
}

export function workplaceAreas(position: Coordinates | null, radius: number | null, tolerance: number | null): AreaData {
  if (!position || radius === null || tolerance === null) return { type: 'FeatureCollection', features: [] }
  return { type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { zone: 'tolerance' }, geometry: { type: 'Polygon', coordinates: [ring(position, radius + tolerance)] } },
    { type: 'Feature', properties: { zone: 'workplace' }, geometry: { type: 'Polygon', coordinates: [ring(position, radius)] } },
  ] }
}

export function workplaceBounds(position: Coordinates, meters: number): [[number, number], [number, number]] {
  const latitudeDelta = meters / earthRadius / radians
  const longitudeDelta = Math.min(180, latitudeDelta / Math.max(0.00001, Math.cos(position.latitude * radians)))
  const displayLatitude = Math.max(-85, Math.min(85, position.latitude))
  return [[position.longitude - longitudeDelta, Math.max(-85, displayLatitude - latitudeDelta)],
    [position.longitude + longitudeDelta, Math.min(85, displayLatitude + latitudeDelta)]]
}
