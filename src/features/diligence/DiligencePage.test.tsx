import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { vietnamToday } from '../../shared/utils/dates'
import { DiligencePage } from './DiligencePage'

const base='http://localhost:8080/api/v1', month=vietnamToday().slice(0,7)
const policy={ initialScore:100, rewardThreshold:80, graceMinutes:5, under15Penalty:5, under30Penalty:10, from30Penalty:20, dailyCap:20, explanationHours:48, halfDayPenalty:15 }
const an={employeeId:'an',employeeName:'An',accountLocked:false,score:90,deductedPoints:10,checkInCount:2,lateCount:2,rewardStatus:'ELIGIBLE',absenceCount:0,missingCount:0,pendingExplanationCount:0,disciplinaryReferral:false}
const binh={...an,employeeId:'binh',employeeName:'Binh',score:70,deductedPoints:30,rewardStatus:'INELIGIBLE'}
let requests: URL[]
function list(url: URL) { const page=Number(url.searchParams.get('page'));return {month:url.searchParams.get('month') || month,timezone:'Asia/Ho_Chi_Minh',finalized:url.searchParams.get('month')!==month,asOf:'2026-11-11T01:00:00Z',policy,items:page ? [{...an,employeeId:'next',employeeName:'Trang hai'}] : [an,binh],page,size:20,totalElements:21,totalPages:2} }
const server=setupServer(
  http.get(base+'/diligence',({request})=>{const url=new URL(request.url);requests.push(url);return HttpResponse.json(list(url))}),
  http.get(base+'/diligence/employees/:id',({params,request})=>{const url=new URL(request.url);return HttpResponse.json({ ...list(url),employee:params.id==='an'?an:binh,totalElements:1,totalPages:1,items:[{workDate:'2026-11-03',shifts:[{id:'schedule',name:'Ca sáng',startsAt:'2026-11-03T01:00:00Z',endsAt:'2026-11-03T09:00:00Z',checkInAt:'2026-11-03T01:35:00Z',checkOutAt:'2026-11-03T09:00:00Z'}],components:[{code:'LATE',points:20,scheduleId:'schedule'}],rawPoints:20,points:20,capped:false,disciplinaryReferral:false,pendingExplanation:false,explanationDeadline:'2026-11-05T09:00:00Z',absent:false,missing:false,review:{employeeId:params.id,workDate:'2026-11-03',absence:'AUTO',earlyLeaveApproved:false,missing:'AUTO',note:'',revision:0,reviewedBy:null,reviewedAt:null}}]})}),
)
beforeAll(()=>server.listen({onUnhandledFrame:'error'}))
beforeEach(()=>{requests=[]})
afterEach(()=>server.resetHandlers())
afterAll(()=>server.close())

it('shows the reward threshold, grace and penalty tiers with provisional monthly scores',async()=>{
  render(<DiligencePage />)
  expect(await screen.findByText('An')).toBeInTheDocument()
  expect(screen.getByText('Tạm tính: Đạt thưởng')).toBeInTheDocument()
  expect(screen.getByText('Tạm tính: Không đạt thưởng')).toBeInTheDocument()
  expect(screen.getByText(/ân hạn 5 phút/)).toBeInTheDocument()
  expect(screen.getByText(/16–30 phút: −10/)).toBeInTheDocument()
  expect(screen.getByLabelText('Điểm của An')).toHaveTextContent('90')
  expect(screen.getByLabelText('Điểm của Binh')).toHaveTextContent('70')
  expect(requests[0].searchParams.get('month')).toBe(month)
})
it('searches by submitting the employee filter and handles an empty result',async()=>{
  server.use(http.get(base+'/diligence',({request})=>{const url=new URL(request.url);requests.push(url);return HttpResponse.json({...list(url),items:[],totalElements:0,totalPages:0})}))
  render(<DiligencePage />)
  await screen.findByText('Chưa có nhân viên phù hợp')
  fireEvent.change(screen.getByLabelText('Tìm nhân viên'),{target:{value:' nobody@example.com '}})
  fireEvent.click(screen.getByRole('button',{name:'Tìm kiếm'}))
  await waitFor(()=>expect(requests.at(-1)?.searchParams.get('q')).toBe('nobody@example.com'))
  expect(requests.at(-1)?.searchParams.get('page')).toBe('0')
})
it('paginates employees on the server and resets pagination on month changes',async()=>{
  render(<DiligencePage />);await screen.findByText('An')
  fireEvent.click(screen.getByRole('button',{name:'Trang sau'}))
  expect(await screen.findByText('Trang hai')).toBeInTheDocument()
  expect(requests.at(-1)?.searchParams.get('page')).toBe('1')
  fireEvent.change(screen.getByLabelText('Tháng tính điểm'),{target:{value:'2026-01'}})
  expect(await screen.findByText(/Kết quả cuối tháng/)).toBeInTheDocument()
  expect(requests.at(-1)?.searchParams.get('page')).toBe('0')
  expect(requests.at(-1)?.searchParams.get('month')).toBe('2026-01')
})
it('opens each employee detail with server check-in times and deduction history',async()=>{
  render(<DiligencePage />);await screen.findByText('An')
  fireEvent.click(screen.getByRole('button',{name:'Xem chi tiết Binh'}))
  const detail=screen.getByRole('region',{name:'Chi tiết chuyên cần'})
  expect(await within(detail).findByText(/Ca sáng/)).toBeInTheDocument()
  expect(within(detail).getByText('−20 điểm')).toBeInTheDocument()
  expect(within(detail).getByText(/Đi trễ: −20 điểm/)).toBeInTheDocument()
  expect(within(detail).getByText(content => content.includes('70/100 điểm'))).toBeInTheDocument()
  fireEvent.click(within(detail).getByRole('button',{name:'Đóng chi tiết'}))
  expect(screen.queryByRole('region',{name:'Chi tiết chuyên cần'})).not.toBeInTheDocument()
})
it('clears the previous employee detail when switching months',async()=>{
  render(<DiligencePage />);await screen.findByText('An')
  fireEvent.click(screen.getByRole('button',{name:'Xem chi tiết An'}));await screen.findByText(/Ca sáng/)
  fireEvent.change(screen.getByLabelText('Tháng tính điểm'),{target:{value:'2026-01'}})
  expect(screen.queryByRole('region',{name:'Chi tiết chuyên cần'})).not.toBeInTheDocument()
  await screen.findByText(/Kết quả cuối tháng/)
})
it('retries failed loading without showing incorrect zero scores',async()=>{
  server.use(http.get(base+'/diligence',()=>HttpResponse.json({message:'Máy chủ đang bận.'},{status:503})))
  render(<DiligencePage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
  expect(screen.queryByLabelText('Điểm của An')).not.toBeInTheDocument()
  server.resetHandlers();fireEvent.click(screen.getByRole('button',{name:'Thử lại'}))
  expect(await screen.findByText('An')).toBeInTheDocument()
})
it('handles revoked detail access without exposing the previously selected employee',async()=>{
  server.use(http.get(base+'/diligence/employees/:id',()=>HttpResponse.json({message:'Bạn không có quyền xem nhân viên này.'},{status:403})))
  render(<DiligencePage />);await screen.findByText('An')
  fireEvent.click(screen.getByRole('button',{name:'Xem chi tiết An'}))
  const detail=screen.getByRole('region',{name:'Chi tiết chuyên cần'})
  expect(await within(detail).findByRole('alert')).toHaveTextContent('không có quyền')
  expect(within(detail).queryByText('Ca sáng')).not.toBeInTheDocument()
})

it('submits manager-confirmed leave with a revision and refreshes monthly score',async()=>{
  const writes:unknown[]=[]
  server.use(
    http.get(base+'/diligence/employees/:id/days/:date/review',({params})=>HttpResponse.json({review:{employeeId:params.id,workDate:params.date,absence:'AUTO',earlyLeaveApproved:false,missing:'AUTO',note:'',revision:0,reviewedBy:null,reviewedAt:null},history:[]})),
    http.put(base+'/diligence/employees/:id/days/:date/review',async({request})=>{writes.push(await request.json());return HttpResponse.json({revision:1})}),
  )
  render(<DiligencePage />);await screen.findByText('An')
  fireEvent.click(screen.getByRole('button',{name:'Xem chi tiết An'}))
  await screen.findByText(/Ca sáng/)
  fireEvent.click(screen.getByRole('button',{name:'Xác minh'}))
  const panel=screen.getByRole('region',{name:'Xác minh chuyên cần'})
  await within(panel).findByLabelText('Nghỉ làm')
  fireEvent.change(within(panel).getByLabelText('Nghỉ làm'),{target:{value:'APPROVED_LEAVE'}})
  fireEvent.change(within(panel).getByLabelText('Lý do và căn cứ xác nhận'),{target:{value:'Đơn nghỉ phép đã duyệt'}})
  fireEvent.click(within(panel).getByRole('button',{name:'Lưu xác minh'}))
  await waitFor(()=>expect(writes).toHaveLength(1))
  expect(writes[0]).toMatchObject({absence:'APPROVED_LEAVE',missing:'AUTO',revision:0,note:'Đơn nghỉ phép đã duyệt'})
  await waitFor(()=>expect(screen.queryByRole('region',{name:'Xác minh chuyên cần'})).not.toBeInTheDocument())
})
