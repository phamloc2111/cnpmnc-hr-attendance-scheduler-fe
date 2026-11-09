import { expect, it } from 'vitest'
import { workplaceAreas } from './workplaceGeometry'

it.each([0, 10.7726, 60])('draws metre-based circles at latitude %s', latitude => {
  const center = { latitude, longitude: 106.6579 }
  const areas = workplaceAreas(center, 100, 30)
  expect(areas.features).toHaveLength(2)
  for (const feature of areas.features) {
    const ring = feature.geometry.coordinates[0]
    expect(ring).toHaveLength(65)
    expect(ring[0]).toEqual(ring[64])
    const expected = feature.properties.zone === 'workplace' ? 100 : 130
    for (const [lon, lat] of ring) {
      const radians = Math.PI / 180
      const distance = 2 * 6371000 * Math.asin(Math.sqrt(Math.sin((lat - latitude) * radians / 2) ** 2 +
        Math.cos(latitude * radians) * Math.cos(lat * radians) * Math.sin((lon - center.longitude) * radians / 2) ** 2))
      expect(distance).toBeCloseTo(expected, 3)
    }
  }
})
it('does not draw an area when coordinates or validated ranges are missing', () => {
  expect(workplaceAreas(null, 100, 30).features).toEqual([])
  expect(workplaceAreas({ latitude: 10, longitude: 106 }, null, 30).features).toEqual([])
})
