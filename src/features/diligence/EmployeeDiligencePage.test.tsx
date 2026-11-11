import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { EmployeeDiligencePage } from './EmployeeDiligencePage'
import { EmployeeDiligenceSummary } from './EmployeeDiligenceSummary'

const base = 'http://localhost:8080/api/v1/diligence/me'
const month = { periodType:'MONTH',from:'2026-11-01',to:'2026-11-30',timezone:'Asia/Ho_Chi_Minh',asOf:'2026-11-11T01:00:00Z',finalized:false,
  score:80,deductedPoints:20,workedMinutes:410,days:[{workDate:'2026-11-02',workedMinutes:410,deductedPoints:20,rawPoints:30,capped:true,pendingExplanation:false,disciplinaryReferral:false,
    components:[{code:'LATE',points:10,scheduleId:'shift-1'},{code:'EARLY_LEAVE',points:20,scheduleId:'shift-1'}]}] }
const week = { ...month,periodType:'WEEK',from:'2026-11-02',to:'2026-11-08',score:95,deductedPoints:5,workedMinutes:120,
  days:[{workDate:'2026-11-03',workedMinutes:120,deductedPoints:5,rawPoints:5,capped:false,pendingExplanation:false,disciplinaryReferral:false,
    components:[{code:'LATE',points:5,scheduleId:'shift-2'}]}] }
const server = setupServer(
  http.get(base, () => HttpResponse.json(month)),
  http.get(base+'/week', () => HttpResponse.json(week)),
)
beforeAll(() => server.listen({ onUnhandledFrame:'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('shows monthly and weekly hours, scores, and each deduction with the daily cap', async () => {
  render(<EmployeeDiligencePage />)
  const monthly = await screen.findByRole('region', { name:'Tháng đã chọn' })
  expect(within(monthly).getByText('6 giờ 50 phút')).toBeInTheDocument()
  expect(within(monthly).getByText('80/100')).toBeInTheDocument()
  const weekly = screen.getByRole('region', { name:'Tuần đã chọn' })
  expect(await within(weekly).findByText('2 giờ 0 phút')).toBeInTheDocument()
  const history = screen.getByRole('region', { name:'Lịch sử trừ điểm' })
  expect(within(history).getByText('Đi trễ: −10 điểm')).toBeInTheDocument()
  expect(within(history).getByText('Về sớm: −20 điểm')).toBeInTheDocument()
  expect(within(history).getByText(/Đã áp dụng trần 20 điểm\/ngày/)).toBeInTheDocument()
  fireEvent.click(within(history).getByRole('button', { name:'Theo tuần' }))
  expect(within(history).getByText('Đi trễ: −5 điểm')).toBeInTheDocument()
})

it('shows the employee home summary and a route to full history', async () => {
  render(<EmployeeDiligenceSummary month="2026-11" revision={0} />)
  const card = screen.getByRole('region', { name:'Giờ làm và điểm chuyên cần tháng hiện tại' })
  expect(await within(card).findByText('6 giờ 50 phút')).toBeInTheDocument()
  expect(within(card).getByText('80')).toBeInTheDocument()
  expect(within(card).getByRole('link', { name:/Xem theo tuần/ })).toHaveAttribute('href','#/my-diligence')
})

it('keeps API errors visible instead of showing a false zero score', async () => {
  server.use(http.get(base,()=>HttpResponse.json({message:'Không tải được dữ liệu.'},{status:503})))
  render(<EmployeeDiligenceSummary month="2026-11" revision={0} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu.')
  expect(screen.queryByText('0 giờ 0 phút')).not.toBeInTheDocument()
})
