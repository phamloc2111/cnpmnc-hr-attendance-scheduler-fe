import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WorkplaceAddressSearch } from './WorkplaceAddressSearch'
import { getWorkplacePlace, searchWorkplacePlaces } from './api'
import type { WorkplacePlaceSuggestion } from './api'

vi.mock('./api', () => ({ searchWorkplacePlaces: vi.fn(), getWorkplacePlace: vi.fn() }))
const search = vi.mocked(searchWorkplacePlaces), detail = vi.mocked(getWorkplacePlace)
const defaults = { disabled: false, position: null, onSelect: vi.fn() }
const places = (prefix: string) => Array.from({ length: 7 }, (_, index) => ({ placeId: prefix + index, label: prefix + ' ' + index }))
function type(value: string) { fireEvent.change(screen.getByLabelText('Tìm địa chỉ'), { target: { value } }) }
async function advance(milliseconds: number) { await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds) }) }
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks()
  search.mockResolvedValue(places('Gợi ý'))
  detail.mockResolvedValue({ placeId: 'id', label: 'Địa chỉ đã chọn', latitude: 10.7726, longitude: 106.6579 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

it('waits 400ms after the last edit, requests once and shows at most five suggestions', async () => {
  render(<WorkplaceAddressSearch {...defaults} />)
  type('Bách'); await advance(399); expect(search).not.toHaveBeenCalled()
  type('Bách Khoa'); await advance(399); expect(search).not.toHaveBeenCalled()
  await advance(1)
  expect(search).toHaveBeenCalledTimes(1)
  expect(search).toHaveBeenCalledWith('Bách Khoa', expect.any(AbortSignal))
  expect(within(screen.getByRole('list', { name: 'Gợi ý địa chỉ' })).getAllByRole('button')).toHaveLength(5)
})
it('searches immediately on click and cancels the queued automatic request', async () => {
  render(<WorkplaceAddressSearch {...defaults} />)
  type('Bách Khoa'); await advance(200)
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' })); await advance(0)
  expect(search).toHaveBeenCalledTimes(1)
  expect(within(screen.getByRole('list', { name: 'Kết quả địa chỉ' })).getAllByRole('button')).toHaveLength(5)
  await advance(1000); expect(search).toHaveBeenCalledTimes(1)
})
it('lets explicit search replace an in-flight suggestion and ignores its late response', async () => {
  let finish: ((value: WorkplacePlaceSuggestion[]) => void) | undefined
  search.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  search.mockResolvedValueOnce(places('Kết quả mới'))
  render(<WorkplaceAddressSearch {...defaults} />)
  type('Bách Khoa'); await advance(400)
  const oldSignal = search.mock.calls[0][1]
  expect(screen.getByRole('button', { name: 'Tìm kiếm' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' })); await advance(0)
  expect(oldSignal.aborted).toBe(true)
  await act(async () => { finish?.(places('Cũ')) })
  expect(within(screen.getByRole('list', { name: 'Kết quả địa chỉ' })).getAllByRole('button')).toHaveLength(5)
  expect(screen.queryByRole('button', { name: 'Cũ 0' })).not.toBeInTheDocument()
})
it('cancels pending suggestions when input becomes too short, disabled or unmounted', async () => {
  const { rerender, unmount } = render(<WorkplaceAddressSearch {...defaults} />)
  type('Bách Khoa'); type('ab'); await advance(1000); expect(search).not.toHaveBeenCalled()
  type('Bách Khoa'); rerender(<WorkplaceAddressSearch {...defaults} disabled />)
  await advance(1000); expect(search).not.toHaveBeenCalled()
  rerender(<WorkplaceAddressSearch {...defaults} />)
  type('Bách Khoa mới'); unmount(); await advance(1000); expect(search).not.toHaveBeenCalled()
})
it('waits until IME composition finishes before scheduling suggestions', async () => {
  render(<WorkplaceAddressSearch {...defaults} />)
  const input = screen.getByLabelText('Tìm địa chỉ')
  fireEvent.compositionStart(input); type('Bách Khoa'); await advance(1000)
  expect(search).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input); await advance(399); expect(search).not.toHaveBeenCalled()
  await advance(1); expect(search).toHaveBeenCalledTimes(1)
})
it('resolves a suggestion without automatically searching the chosen address again', async () => {
  const onSelect = vi.fn()
  render(<WorkplaceAddressSearch {...defaults} onSelect={onSelect} />)
  type('Bách Khoa'); await advance(400)
  fireEvent.click(screen.getByRole('button', { name: 'Gợi ý 0' })); await advance(0)
  expect(onSelect).toHaveBeenCalledWith({ latitude: 10.7726, longitude: 106.6579 })
  expect(screen.getByLabelText('Tìm địa chỉ')).toHaveValue('Địa chỉ đã chọn')
  await advance(1000); expect(search).toHaveBeenCalledTimes(1)
})
it('Enter cancels the debounce, searches immediately and prevents submitting the settings form', async () => {
  const submit = vi.fn(event => event.preventDefault())
  render(<form onSubmit={submit}><WorkplaceAddressSearch {...defaults} /></form>)
  type('Bách Khoa')
  expect(fireEvent.keyDown(screen.getByLabelText('Tìm địa chỉ'), { key: 'Enter' })).toBe(false)
  await advance(0); expect(search).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('list', { name: 'Kết quả địa chỉ' })).toBeInTheDocument()
  await advance(1000); expect(search).toHaveBeenCalledTimes(1); expect(submit).not.toHaveBeenCalled()
})
