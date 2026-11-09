import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AreaData, MapEvent } from '@goongmaps/goong-js'
import { GoongWorkplaceMap } from './GoongWorkplaceMap'
import { loadGoongSdk } from './goongSdk'

vi.mock('./goongSdk', () => ({ loadGoongSdk: vi.fn() }))
const maps: FakeMap[] = [], markers: FakeMarker[] = []
class FakeMap {
  events = new Map<string, (event: MapEvent) => void>()
  source = { setData: vi.fn() }
  remove = vi.fn()
  resize = vi.fn(() => this)
  fitBounds = vi.fn(() => this)
  options: { center: [number, number]; zoom: number }
  constructor(options: { center: [number, number]; zoom: number }) { this.options = options; maps.push(this) }
  on(event: string, listener: (event: MapEvent) => void) { this.events.set(event, listener); return this }
  emit(event: string, value: MapEvent = {}) { this.events.get(event)?.(value) }
  addControl() { return this }
  addSource(_id: string, source: { data: AreaData }) { this.source.setData(source.data); return this }
  getSource() { return this.source }
  addLayer() { return this }
}
class FakeMarker {
  position: [number, number] = [0, 0]
  draggable = true
  element = document.createElement('div')
  drag: (() => void) | null = null
  remove = vi.fn()
  constructor() { markers.push(this) }
  setLngLat(position: [number, number]) { this.position = position; return this }
  getLngLat() { return { lng: this.position[0], lat: this.position[1] } }
  setDraggable(value: boolean) { this.draggable = value; return this }
  getElement() { return this.element }
  addTo() { return this }
  on(_event: string, listener: () => void) { this.drag = listener; return this }
}
const sdk = { accessToken: '', supported: vi.fn(() => true), Map: FakeMap, Marker: FakeMarker, NavigationControl: class {} }
const position = { latitude: 10.7726, longitude: 106.6579 }
const defaults = { position, radius: 100, tolerance: 30, disabled: false, onSelect: vi.fn() }
beforeEach(() => {
  maps.length = 0; markers.length = 0; vi.clearAllMocks()
  sdk.supported.mockReturnValue(true)
  vi.stubEnv('VITE_GOONG_MAPTILES_KEY', 'fake-test-maptiles-key')
  vi.mocked(loadGoongSdk).mockResolvedValue(sdk)
})
afterEach(() => { vi.unstubAllEnvs() })
async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Mở bản đồ Goong' }))
  await waitFor(() => expect(maps).toHaveLength(1))
  act(() => maps[0].emit('load'))
}
it('keeps manual input available without a key and never loads the SDK', () => {
  vi.stubEnv('VITE_GOONG_MAPTILES_KEY', '')
  render(<GoongWorkplaceMap {...defaults} />)
  expect(screen.getByRole('status')).toHaveTextContent('Bản đồ chưa được cấu hình')
  expect(loadGoongSdk).not.toHaveBeenCalled()
})
it('loads only on request, selects coordinates on click/drag, and updates areas without recreating the map', async () => {
  const onSelect = vi.fn()
  const { rerender, unmount } = render(<GoongWorkplaceMap {...defaults} onSelect={onSelect} />)
  expect(loadGoongSdk).not.toHaveBeenCalled()
  await open()
  act(() => maps[0].emit('click', { lngLat: { lat: 11, lng: 107 } }))
  expect(onSelect).toHaveBeenLastCalledWith({ latitude: 11, longitude: 107 })
  markers[0].setLngLat([108, 12]); act(() => markers[0].drag?.())
  expect(onSelect).toHaveBeenLastCalledWith({ latitude: 12, longitude: 108 })
  rerender(<GoongWorkplaceMap {...defaults} position={{ latitude: 12, longitude: 108 }} radius={200} tolerance={50} onSelect={onSelect} />)
  expect(maps).toHaveLength(1)
  expect(markers[0].position).toEqual([108, 12])
  expect(maps[0].source.setData).toHaveBeenLastCalledWith(expect.objectContaining({ features: expect.arrayContaining([
    expect.objectContaining({ properties: { zone: 'workplace' } }), expect.objectContaining({ properties: { zone: 'tolerance' } }),
  ]) }))
  rerender(<GoongWorkplaceMap {...defaults} disabled onSelect={onSelect} />)
  onSelect.mockClear()
  act(() => maps[0].emit('click', { lngLat: { lat: 13, lng: 109 } }))
  act(() => markers[0].drag?.())
  expect(onSelect).not.toHaveBeenCalled()
  expect(markers[0].draggable).toBe(false)
  unmount(); expect(maps[0].remove).toHaveBeenCalledOnce()
})
it('does not treat the initial map viewport as a selected workplace', async () => {
  render(<GoongWorkplaceMap {...defaults} position={null} />)
  await open()
  expect(markers).toHaveLength(0)
  expect(defaults.onSelect).not.toHaveBeenCalled()
  expect(screen.getByText(/Chưa chọn vị trí/)).toBeInTheDocument()
})
it('offers retry after map errors and removes the old instance', async () => {
  render(<GoongWorkplaceMap {...defaults} />)
  await open(); act(() => maps[0].emit('error'))
  expect(screen.getByRole('alert')).toHaveTextContent('nhập tọa độ thủ công')
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại bản đồ' }))
  await waitFor(() => expect(maps).toHaveLength(2))
  expect(maps[0].remove).toHaveBeenCalledOnce()
  act(() => maps[1].emit('load'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('handles unsupported WebGL without creating a broken map', async () => {
  sdk.supported.mockReturnValue(false)
  render(<GoongWorkplaceMap {...defaults} />)
  fireEvent.click(screen.getByRole('button', { name: 'Mở bản đồ Goong' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bản đồ Goong')
  expect(maps).toHaveLength(0)
})
it('does not create a map if the page is left while its SDK is loading', async () => {
  let finish: ((value: typeof sdk) => void) | undefined
  vi.mocked(loadGoongSdk).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const { unmount } = render(<GoongWorkplaceMap {...defaults} />)
  fireEvent.click(screen.getByRole('button', { name: 'Mở bản đồ Goong' })); unmount()
  await act(async () => { finish?.(sdk) })
  expect(maps).toHaveLength(0)
})
