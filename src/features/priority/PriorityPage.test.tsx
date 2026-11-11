import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { PriorityPage } from './PriorityPage'

const base = 'http://localhost:8080/api/v1'
const defaultWeights = { punctuality: 35, hourBalance: 25, tenure: 15, positionMatch: 15, managerRating: 10 }
const score = { employeeId: 'employee-1', employeeName: 'An', score: 84, punctuality: 80, hourBalance: 100, tenure: 50, positionMatch: 50, managerRating: 60, absencePenalty: 5, previousWeekMinutes: 300, currentWeekMinutes: 480, unexcusedAbsences: 1 }
const requests: string[] = []
const server = setupServer(
  http.get(base + '/positions', () => HttpResponse.json({ items: [], page: 0, totalPages: 0, totalElements: 0 })),
  http.get(base + '/priority-scores', ({ request }) => { requests.push(new URL(request.url).searchParams.get('managerId') || 'self'); return HttpResponse.json({ managerId: 'manager-1', weekStart: '2026-11-09', positionId: null, weights: defaultWeights, items: [score] }) }),
  http.get(base + '/priority-scores/ratings', () => HttpResponse.json({ 'employee-1': 3 })),
  http.get(base + '/accounts', () => HttpResponse.json({ items: [{ id: 'manager-1', displayName: 'Quản lý An' }], page: 0, size: 100, totalPages: 1, totalElements: 1 })),
  http.put(base + '/priority-scores/weights', async ({ request }) => { const body = await request.json() as typeof defaultWeights; return HttpResponse.json(body) }),
  http.put(base + '/priority-scores/ratings/:employeeId', () => new HttpResponse(null, { status: 204 })),
)
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); requests.length = 0 })
afterAll(() => server.close())

it('shows the team score and prevents invalid weight totals', async () => {
  render(<PriorityPage role="MANAGER" />)
  expect(await screen.findByText('An')).toBeInTheDocument()
  expect(screen.getByText('−5')).toBeInTheDocument()
  expect(screen.getByText(/Tổng 100%/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Đúng giờ/), { target: { value: '36' } })
  expect(screen.getByRole('button', { name: 'Lưu trọng số' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(/Đúng giờ/), { target: { value: '35' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu trọng số' }))
  await waitFor(() => expect(requests.length).toBeGreaterThan(1))
})
it('requires an admin to select a manager before loading a team', async () => {
  render(<PriorityPage role="ADMIN" />)
  await screen.findByText('Chọn quản lý để xem điểm ưu tiên.')
  expect(requests).toHaveLength(0)
  fireEvent.change(screen.getByLabelText('Nhóm quản lý'), { target: { value: 'manager-1' } })
  expect(await screen.findByText('An')).toBeInTheDocument()
  expect(requests).toContain('manager-1')
})
