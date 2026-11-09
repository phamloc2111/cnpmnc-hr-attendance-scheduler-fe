import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); sessionStorage.clear() })

it.each([
  ['backend-local', 'http://localhost:8080/api/v1'],
  ['backend-cloud', 'https://cloud.example.test/hr/api/v1'],
])('sends API requests and protected photos to the selected %s backend', async (mode, expectedBase) => {
  vi.stubEnv('MODE', mode)
  vi.stubEnv('VITE_API_LOCAL_BASE_URL', 'http://localhost:8080/')
  vi.stubEnv('VITE_API_CLOUD_BASE_URL', 'https://cloud.example.test/hr/api/v1/')
  vi.resetModules()
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'actor' }), { status: 200 }))
    .mockResolvedValueOnce(new Response('photo', { status: 200, headers: { 'Content-Type': 'image/jpeg' } }))
  vi.stubGlobal('fetch', fetchMock)
  const { request, saveSession } = await import('./client')
  saveSession({ accessToken: 'fake-test-token', expiresAt: new Date(Date.now() + 60000).toISOString() })
  expect(await request('/auth/me')).toEqual({ id: 'actor' })
  expect(fetchMock.mock.calls[0][0]).toBe(expectedBase + '/auth/me')
  const options = fetchMock.mock.calls[0][1] as RequestInit
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer fake-test-token')
  const photo = await request<Blob>('/attendance/events/event/photo', {}, false, 'blob')
  expect(fetchMock.mock.calls[1][0]).toBe(expectedBase + '/attendance/events/event/photo')
  expect(photo.type).toBe('image/jpeg')
})
