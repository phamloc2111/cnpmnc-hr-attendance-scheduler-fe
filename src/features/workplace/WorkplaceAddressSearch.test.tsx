import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { WorkplaceAddressSearch } from './WorkplaceAddressSearch'

const base = 'http://localhost:8080/api/v1/workplace-settings/places'
let searches = 0, details = 0
const server = setupServer(
  http.get(base, ({ request }) => {
    searches++; expect(new URL(request.url).searchParams.get('q')).toBe('Bách Khoa & Quận 10')
    return HttpResponse.json([{ placeId: 'id/+=', label: 'Đại học Bách Khoa, TP.HCM' }])
  }),
  http.get(base + '/detail', ({ request }) => {
    details++; expect(new URL(request.url).searchParams.get('placeId')).toBe('id/+=')
    return HttpResponse.json({ placeId: 'id/+=', label: '268 Lý Thường Kiệt', latitude: 10.7726, longitude: 106.6579 })
  }),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => { searches = 0; details = 0 })
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())
const defaults = { disabled: false, position: null, onSelect: vi.fn() }
function enter(query = 'Bách Khoa & Quận 10') { fireEvent.change(screen.getByLabelText('Tìm địa chỉ'), { target: { value: query } }) }
it('searches immediately before the debounce and resolves only the selected address', async () => {
  const onSelect = vi.fn()
  const { rerender } = render(<WorkplaceAddressSearch {...defaults} onSelect={onSelect} />)
  enter(); expect(searches).toBe(0); expect(details).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Đại học Bách Khoa, TP.HCM' }))
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ latitude: 10.7726, longitude: 106.6579 }))
  expect(searches).toBe(1); expect(details).toBe(1)
  rerender(<WorkplaceAddressSearch {...defaults} position={{ latitude: 10.7726, longitude: 106.6579 }} onSelect={onSelect} />)
  expect(screen.getByRole('status')).toHaveTextContent('Đã chọn: 268 Lý Thường Kiệt')
  rerender(<WorkplaceAddressSearch {...defaults} position={{ latitude: 11, longitude: 107 }} onSelect={onSelect} />)
  expect(screen.queryByText(/Đã chọn:/)).not.toBeInTheDocument()
})
it('validates short input and does not submit the surrounding settings form on Enter', async () => {
  const save = vi.fn(event => event.preventDefault())
  render(<form onSubmit={save}><WorkplaceAddressSearch {...defaults} /></form>)
  enter('ab'); expect(fireEvent.keyDown(screen.getByLabelText('Tìm địa chỉ'), { key: 'Enter' })).toBe(false)
  expect(await screen.findByRole('alert')).toHaveTextContent('3 đến 200')
  expect(searches).toBe(0); expect(save).not.toHaveBeenCalled()
})
it('shows an empty result and preserves the current coordinate selection', async () => {
  server.use(http.get(base, () => HttpResponse.json([])))
  const onSelect = vi.fn(); render(<WorkplaceAddressSearch {...defaults} onSelect={onSelect} />)
  enter(); fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  expect(await screen.findByText(/Không tìm thấy địa chỉ phù hợp/)).toBeInTheDocument()
  expect(onSelect).not.toHaveBeenCalled()
})
it('handles a missing REST key and allows an explicit retry', async () => {
  server.use(http.get(base, () => HttpResponse.json({ code: 'PLACE_SEARCH_NOT_CONFIGURED', message: 'Tìm địa chỉ chưa được cấu hình.' }, { status: 503 })))
  render(<WorkplaceAddressSearch {...defaults} />); enter()
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('chưa được cấu hình')
  expect(screen.getByLabelText('Tìm địa chỉ')).toHaveValue('Bách Khoa & Quận 10')
  server.resetHandlers(); fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  expect(await screen.findByRole('button', { name: 'Đại học Bách Khoa, TP.HCM' })).toBeInTheDocument()
})
it('ignores a stale response after the user changes their query', async () => {
  let finish: (() => void) | undefined
  server.use(http.get(base, async () => {
    searches++; await new Promise<void>(resolve => { finish = resolve })
    return HttpResponse.json([{ placeId: 'stale', label: 'Kết quả cũ' }])
  }))
  render(<WorkplaceAddressSearch {...defaults} />); enter()
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  await waitFor(() => expect(searches).toBe(1)); enter('Địa chỉ khác'); finish?.()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kết quả cũ' })).not.toBeInTheDocument())
  expect(screen.getByLabelText('Tìm địa chỉ')).toHaveValue('Địa chỉ khác')
})
it('does not replace coordinates when the chosen result fails to resolve', async () => {
  server.use(http.get(base + '/detail', () => HttpResponse.json({ message: 'Không thể lấy tọa độ địa chỉ.' }, { status: 502 })))
  const onSelect = vi.fn(); render(<WorkplaceAddressSearch {...defaults} onSelect={onSelect} />)
  enter(); fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Đại học Bách Khoa, TP.HCM' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lấy tọa độ')
  expect(onSelect).not.toHaveBeenCalled()
})
it('ignores a pending detail if the user has picked a different point on the map', async () => {
  let finish: (() => void) | undefined
  server.use(http.get(base + '/detail', async () => {
    details++; await new Promise<void>(resolve => { finish = resolve })
    return HttpResponse.json({ placeId: 'id/+=', label: 'Old address', latitude: 10, longitude: 106 })
  }))
  const onSelect = vi.fn()
  const { rerender } = render(<WorkplaceAddressSearch {...defaults} onSelect={onSelect} />)
  enter(); fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Đại học Bách Khoa, TP.HCM' }))
  await waitFor(() => expect(details).toBe(1))
  rerender(<WorkplaceAddressSearch {...defaults} position={{ latitude: 11, longitude: 107 }} onSelect={onSelect} />)
  finish?.()
  await waitFor(() => expect(screen.queryByText(/Đang lấy tọa độ/)).not.toBeInTheDocument())
  expect(onSelect).not.toHaveBeenCalled()
})
