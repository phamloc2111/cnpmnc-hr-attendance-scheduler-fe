import { expect, it } from 'vitest'
import { resolveBackendApiUrl } from './backendUrl'

it('keeps explicit local/cloud targets independent of the legacy default', () => {
  const env = { VITE_API_BASE_URL: 'https://default.example.test', VITE_API_LOCAL_BASE_URL: 'http://192.168.1.10:8080', VITE_API_CLOUD_BASE_URL: 'https://cloud.example.test' }
  expect(resolveBackendApiUrl('backend-local', env)).toBe('http://192.168.1.10:8080/api/v1')
  expect(resolveBackendApiUrl('backend-cloud', env)).toBe('https://cloud.example.test/api/v1')
  expect(resolveBackendApiUrl('production', env)).toBe('https://default.example.test/api/v1')
})
it('defaults only the local and legacy modes to localhost', () => {
  expect(resolveBackendApiUrl('backend-local', {})).toBe('http://localhost:8080/api/v1')
  expect(resolveBackendApiUrl('development', {})).toBe('http://localhost:8080/api/v1')
  expect(() => resolveBackendApiUrl('backend-cloud', { VITE_API_BASE_URL: 'http://localhost:8080' })).toThrow('VITE_API_CLOUD_BASE_URL')
  expect(() => resolveBackendApiUrl('backend-cloud', { VITE_API_CLOUD_BASE_URL: '  ' })).toThrow('VITE_API_CLOUD_BASE_URL')
})
it.each([
  [' https://cloud.example.test/// ', 'https://cloud.example.test/api/v1'],
  ['https://cloud.example.test/api/v1/', 'https://cloud.example.test/api/v1'],
  ['https://cloud.example.test/hr/api/v1/', 'https://cloud.example.test/hr/api/v1'],
  ['https://cloud.example.test/hr/', 'https://cloud.example.test/hr/api/v1'],
  ['', '/api/v1'],
])('normalizes a configured base without duplicating the API path: %s', (value, expected) => {
  expect(resolveBackendApiUrl('production', { VITE_API_BASE_URL: value })).toBe(expected)
})
it.each(['not-a-url', 'ftp://example.test', 'https://user:password@example.test', 'https://example.test?key=value', 'https://example.test#fragment'])('rejects invalid or ambiguous backend configuration: %s', value => {
  expect(() => resolveBackendApiUrl('backend-cloud', { VITE_API_CLOUD_BASE_URL: value })).toThrow()
})
