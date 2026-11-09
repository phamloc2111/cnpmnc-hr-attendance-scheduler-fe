import { render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AttendancePhoto } from './AttendancePhoto'
import { saveSession } from '../../shared/api/client'
const server = setupServer(http.get('http://localhost:8080/api/v1/attendance/events/event/photo', ({ request }) => {
  expect(request.headers.get('authorization')).toBe('Bearer test-token')
  return new HttpResponse(new Uint8Array([255,216,255]), { headers: { 'Content-Type': 'image/jpeg' } })
}))
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  saveSession({ accessToken: 'test-token', expiresAt: new Date(Date.now()+3600000).toISOString() })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-photo') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
it('loads private evidence with authentication and releases the object URL', async () => {
  const { unmount } = render(<AttendancePhoto src="/api/v1/attendance/events/event/photo" alt="Ảnh mới" className="photo" />)
  await waitFor(() => expect(screen.getByRole('img', { name: 'Ảnh mới' })).toHaveAttribute('src', 'blob:test-photo'))
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-photo')
})
it('shows authorization failures without exposing a public image URL', async () => {
  server.use(http.get('http://localhost:8080/api/v1/attendance/events/event/photo', () => HttpResponse.json({ message: 'Không có quyền xem ảnh' }, { status: 403 })))
  render(<AttendancePhoto src="/api/v1/attendance/events/event/photo" alt="Ảnh mới" className="photo" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền xem ảnh')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})
