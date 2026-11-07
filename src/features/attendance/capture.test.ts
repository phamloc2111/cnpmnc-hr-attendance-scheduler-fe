import { afterEach, expect, it, vi } from 'vitest'
import { capturePhoto, freshLocation } from './capture'
afterEach(() => vi.restoreAllMocks())
it('requests a fresh high accuracy position at submission rather than cached coordinates', async () => {
  const position = { timestamp: 100 } as GeolocationPosition
  const locate = vi.fn((success: PositionCallback) => success(position))
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: locate } })
  expect(await freshLocation()).toBe(position)
  expect(locate.mock.calls[0]).toHaveLength(3)
  expect(locate).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { maximumAge: 0, enableHighAccuracy: true, timeout: 15000 })
})
it('explains denied GPS permission', async () => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } })
  await expect(freshLocation()).rejects.toThrow('Bạn chưa cho phép định vị')
})
it('does not create an empty camera photo before a video frame is ready', async () => {
  await expect(capturePhoto(document.createElement('video'), {} as GeolocationPosition)).rejects.toThrow('Camera chưa sẵn sàng')
})
