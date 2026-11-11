import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ExplanationPage } from './ExplanationPage'
import { ManagementExplanationsPage } from './ManagementExplanationsPage'

const base = 'http://localhost:8080/api/v1/attendance/explanations'
const candidate = { scheduleId: 'shift-1', workDate: '2026-11-09', shiftName: 'Morning', startsAt: '2026-11-09T01:00:00Z', endsAt: '2026-11-09T09:00:00Z', category: 'LATE', attendanceRecordId: null, explanation: null }
const explanation = { id: 'explanation-1', scheduleId: 'shift-1', employeeId: 'employee-1', employeeName: 'Nguyen An', workDate: '2026-11-09', category: 'LATE', attendanceRecordId: null, reason: 'Traffic interruption on the way to work', submittedAt: '2026-11-09T03:00:00Z', status: 'PENDING', decisionReason: null, exemptLatePenalty: false, decidedBy: null, decidedAt: null }
const page = <T,>(items: T[]) => ({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 })
let submitted: Record<string, unknown> | undefined
let decision: Record<string, unknown> | undefined
let submittedFiles: File[] | undefined
const server = setupServer(
  http.get(base + '/candidates', () => HttpResponse.json(page([candidate]))),
  http.get(base + '/mine', () => HttpResponse.json(page([]))),
  http.post(base, async ({ request }) => {
    if(request.headers.get('content-type')?.includes('multipart/form-data')){
      const body=await request.formData()
      submitted=Object.fromEntries(body.entries())
      submittedFiles=body.getAll('images') as File[]
    } else submitted = await request.json() as Record<string, unknown>
    return HttpResponse.json(explanation)
  }),
  http.get(base, () => HttpResponse.json(page([explanation]))),
  http.patch(base + '/:id/decision', async ({ request }) => { decision = await request.json() as Record<string, unknown>; return HttpResponse.json({ ...explanation, status: decision.approved ? 'APPROVED' : 'REJECTED' }) }),
)
beforeAll(() => { vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(()=>'blob:test'), revokeObjectURL: vi.fn() })); HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }; server.listen({ onUnhandledFrame: 'error' }) })
afterEach(() => { server.resetHandlers(); submitted = undefined; submittedFiles = undefined; decision = undefined })
afterAll(() => server.close())

it('submits a reason for an eligible shift and reloads its status', async () => {
  render(<ExplanationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Gửi giải trình' }))
  const form = screen.getByRole('dialog', { name: 'Gửi giải trình · Đi trễ' })
  expect(form).toHaveAttribute('open')
  fireEvent.change(within(form).getByLabelText('Lý do giải trình'), { target: { value: 'Traffic interruption on the way to work' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Gửi giải trình' }))
  await waitFor(() => expect(submitted).toMatchObject({ scheduleId: 'shift-1', category: 'LATE', reason: 'Traffic interruption on the way to work' }))
})

it('requires a rejection reason and sends the management decision', async () => {
  render(<ManagementExplanationsPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
  const form = screen.getByRole('dialog', { name: /giải trình · Nguyen An/ })
  expect(within(form).getByRole('button', { name: 'Xác nhận từ chối' })).toBeDisabled()
  fireEvent.change(within(form).getByLabelText('Lý do từ chối'), { target: { value: 'Insufficient evidence for the reported delay' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Xác nhận từ chối' }))
  await waitFor(() => expect(decision).toMatchObject({ approved: false, exemptLatePenalty: false, reason: 'Insufficient evidence for the reported delay' }))
})

it('sends an explicit late-penalty exemption only with written grounds', async () => {
  render(<ManagementExplanationsPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Duyệt' }))
  const form = screen.getByRole('dialog', { name: /giải trình · Nguyen An/ })
  fireEvent.click(within(form).getByRole('checkbox', { name: 'Xác nhận nguyên nhân được miễn điểm trễ' }))
  expect(within(form).getByRole('button', { name: 'Xác nhận duyệt' })).toBeDisabled()
  fireEvent.change(within(form).getByLabelText('Căn cứ xử lý'), { target: { value: 'Manager confirmed the permitted delay' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Xác nhận duyệt' }))
  await waitFor(() => expect(decision).toMatchObject({ approved: true, exemptLatePenalty: true, reason: 'Manager confirmed the permitted delay' }))
})

it('closes the employee explanation dialog without submitting', async () => {
  render(<ExplanationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Gửi giải trình' }))
  const dialog = screen.getByRole('dialog', { name: 'Gửi giải trình · Đi trễ' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
  expect(screen.queryByRole('dialog', { name: 'Gửi giải trình · Đi trễ' })).not.toBeInTheDocument()
  expect(submitted).toBeUndefined()
})

it('submits up to three images with the explanation and rejects a fourth', async () => {
  render(<ExplanationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Gửi giải trình' }))
  const form = screen.getByRole('dialog')
  const input=within(form).getByLabelText('Ảnh minh chứng (tối đa 3 ảnh)') as HTMLInputElement
  const files=[1,2,3,4].map(index=>new File(['image data'],index+'.jpg',{type:'image/jpeg'}))
  fireEvent.change(input,{target:{files}})
  expect(within(form).getByRole('alert')).toHaveTextContent('tối đa 3 ảnh')
  fireEvent.change(input,{target:{files:files.slice(0,3)}})
  expect(input).toBeDisabled()
  expect(within(form).getByLabelText('Ảnh đã chọn').querySelectorAll('img')).toHaveLength(3)
  fireEvent.change(within(form).getByLabelText('Lý do giải trình'), { target: { value: 'Road closure caused my delay' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Gửi giải trình' }))
  await waitFor(()=>expect(submittedFiles).toHaveLength(3))
  expect(submitted).toMatchObject({scheduleId:'shift-1',category:'LATE',reason:'Road closure caused my delay'})
})

it('shows authenticated explanation images to the reviewer', async () => {
  server.use(http.get(base,()=>HttpResponse.json(page([{...explanation,images:[{id:'image-1',url:'/api/v1/attendance/explanations/explanation-1/images/image-1',contentType:'image/jpeg',sizeBytes:4}]}]))),
    http.get(base+'/explanation-1/images/image-1',()=>new HttpResponse('photo',{headers:{'Content-Type':'image/jpeg'}})))
  render(<ManagementExplanationsPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Duyệt' }))
  await waitFor(()=>expect(within(screen.getByRole('dialog')).getByAltText('Ảnh minh chứng giải trình')).toBeInTheDocument())
})

it('keeps the explanation dialog and entered reason when the file picker is canceled', async () => {
  render(<ExplanationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Gửi giải trình' }))
  const dialog = screen.getByRole('dialog')
  const reason = within(dialog).getByLabelText('Lý do giải trình')
  fireEvent.change(reason, { target: { value: 'Road closure caused my delay' } })
  fireEvent(within(dialog).getByLabelText('Ảnh minh chứng (tối đa 3 ảnh)'), new Event('cancel', { bubbles: true, cancelable: true }))
  expect(dialog).toHaveAttribute('open')
  expect(reason).toHaveValue('Road closure caused my delay')
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
