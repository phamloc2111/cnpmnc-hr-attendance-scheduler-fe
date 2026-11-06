import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { PositionSelect } from './PositionSelect'
const base = 'http://localhost:8080/api/v1/positions'
const server = setupServer(
  http.get(base, () => HttpResponse.json({ items: [{ id: 'active', name: 'Thu ngân', active: true, version: 0 }], page: 0, totalPages: 1, totalElements: 1 })),
  http.get(base + '/:id', ({ params }) => HttpResponse.json({ id: params.id, name: params.id === 'old' ? 'Vị trí cũ' : 'Thu ngân', active: params.id !== 'old', version: 0 })),
)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
function Picker({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <PositionSelect id="position-picker" label="Vị trí" value={value} currentId={initial || null} onChange={setValue} />
}
it('retains an inactive current position when editing', async () => {
  render(<Picker initial="old" />)
  expect(await screen.findByRole('option', { name: 'Vị trí cũ (Ngừng sử dụng)' })).toBeEnabled()
  expect(screen.getByLabelText('Vị trí')).toHaveValue('old')
  const user = userEvent.setup()
  await user.selectOptions(screen.getByLabelText('Vị trí'), 'active')
  expect(screen.getByLabelText('Vị trí')).toHaveValue('active')
})
it('shows an empty catalog message instead of a free text input', async () => {
  server.use(http.get(base, () => HttpResponse.json({ items: [], page: 0, totalPages: 0, totalElements: 0 })))
  render(<Picker />)
  expect(await screen.findByText(/Chưa có vị trí đang sử dụng/)).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Vị trí' })).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
it('supports retry after a failed catalog request', async () => {
  server.use(http.get(base, () => HttpResponse.json({ message: 'Danh mục tạm lỗi' }, { status: 503 })))
  render(<Picker />); const user = userEvent.setup()
  expect(await screen.findByRole('alert')).toHaveTextContent('Danh mục tạm lỗi')
  server.resetHandlers()
  await user.click(screen.getByRole('button', { name: 'Thử lại danh mục' }))
  expect(await screen.findByRole('option', { name: 'Thu ngân' })).toBeInTheDocument()
})
it('keeps the selected ID when browsing later catalog pages', async () => {
  server.use(http.get(base, ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get('page'))
    return HttpResponse.json({ items: page === 0 ? [{ id: 'active', name: 'Thu ngân', active: true, version: 0 }] : [{ id: 'other', name: 'Pha chế', active: true, version: 0 }], page, totalPages: 2, totalElements: 2 })
  }))
  render(<Picker />); const user = userEvent.setup()
  await screen.findByRole('option', { name: 'Thu ngân' })
  await user.selectOptions(screen.getByLabelText('Vị trí'), 'active')
  await user.click(screen.getByRole('button', { name: 'Vị trí tiếp' }))
  await screen.findByRole('option', { name: 'Pha chế' })
  await waitFor(() => expect(screen.getByLabelText('Vị trí')).toHaveValue('active'))
})
