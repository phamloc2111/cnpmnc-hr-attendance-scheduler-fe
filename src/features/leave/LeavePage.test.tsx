import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { LeavePage } from './LeavePage'

const base = 'http://localhost:8080/api/v1'

const quotaMock = {
  month: '2026-11',
  maxAllowed: 2,
  approved: 1,
  pending: 0,
  remaining: 1,
  canSubmit: true
}

const leavesMock = [
  {
    id: 'leave-1',
    employeeId: 'emp-1',
    employeeName: 'Nguyễn Văn A',
    workDate: '2026-11-10',
    shiftName: 'Ca sáng',
    reason: 'Việc gia đình',
    status: 'APPROVED',
    reviewerName: 'Quản lý',
    createdAt: '2026-11-08T10:00:00Z'
  }
]

let quotaState = { ...quotaMock }
let submitCalls: unknown[] = []

const server = setupServer(
  http.get(base + '/leave-requests/quota', () => HttpResponse.json(quotaState)),
  http.get(base + '/leave-requests/me', () => HttpResponse.json(leavesMock)),
  http.post(base + '/leave-requests', async ({ request }) => {
    const body = await request.json()
    submitCalls.push(body)
    return HttpResponse.json({
      id: 'leave-new',
      employeeId: 'emp-1',
      employeeName: 'Nguyễn Văn A',
      workDate: '2026-11-20',
      shiftName: 'Ca làm việc',
      reason: 'Bị ốm',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    })
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  quotaState = { ...quotaMock }
  submitCalls = []
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('displays leave quota and submit leave request successfully', async () => {
  const user = userEvent.setup()
  render(<LeavePage />)

  expect(await screen.findByText('Hạn mức phép tháng 2026-11')).toBeInTheDocument()
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  expect(screen.getByText('Việc gia đình')).toBeInTheDocument()

  const reasonInput = screen.getByLabelText('Lý do xin nghỉ (*)')
  await user.type(reasonInput, 'Bị sốt cao')

  const submitButton = screen.getByRole('button', { name: 'Gửi đơn xin nghỉ' })
  await user.click(submitButton)

  await waitFor(() => {
    expect(screen.getByText(/Gửi đơn xin nghỉ phép thành công/)).toBeInTheDocument()
  })
})

it('blocks submitting when quota is exhausted', async () => {
  quotaState = { ...quotaMock, approved: 2, remaining: 0, canSubmit: false }
  render(<LeavePage />)

  expect(await screen.findByText('Bạn đã hết lượt nghỉ phép trong tháng này.')).toBeInTheDocument()
  const submitButton = screen.getByRole('button', { name: 'Gửi đơn xin nghỉ' })
  expect(submitButton).toBeDisabled()
})
