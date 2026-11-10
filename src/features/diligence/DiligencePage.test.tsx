import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { vietnamToday } from '../../shared/utils/dates'
import { DiligencePage } from './DiligencePage'

const base='http://localhost:8080/api/v1', month=vietnamToday().slice(0,7)
const policy={ initialScore:100, rewardThreshold:90, graceMinutes:5, under15Penalty:5, under30Penalty:10, from30Penalty:20 }
const an={employeeId:'an',employeeName:'An',accountLocked:false,score:90,deductedPoints:10,checkInCount:2,lateCount:2,rewardStatus:'ELIGIBLE'}
const binh={...an,employeeId:'binh',employeeName:'Binh',score:70,deductedPoints:30,rewardStatus:'INELIGIBLE'}
let requests: URL[]
function list(url: URL) { const page=Number(url.searchParams.get('page'));return {month:url.searchParams.get('month') || month,timezone:'Asia/Ho_Chi_Minh',finalized:url.searchParams.get('month')!==month,asOf:'2026-11-11T01:00:00Z',policy,items:page ? [{...an,employeeId:'next',employeeName:'Trang hai'}] : [an,binh],page,size:20,totalElements:21,totalPages:2} }
const server=setupServer(
  http.get(base+'/diligence',({request})=>{const url=new URL(request.url);requests.push(url);return HttpResponse.json(list(url))}),
  http.get(base+'/diligence/employees/:id',({params,request})=>{const url=new URL(request.url);return HttpResponse.json({ ...list(url),employee:params.id==='an'?an:binh,totalElements:1,totalPages:1,items:[{scheduleId:'schedule',workDate:'2026-11-03',shiftName:'Ca sáng',startsAt:'2026-11-03T01:00:00Z',checkInAt:'2026-11-03T01:35:00Z',lateSeconds:2100,deductedPoints:20}]})}),
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
  expect(screen.getByText(/Ân hạn đến 5 phút/)).toBeInTheDocument()
  expect(screen.getByText(/Từ 15 đến dưới 30 phút: −10/)).toBeInTheDocument()
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
  expect(await within(detail).findByText('Ca sáng')).toBeInTheDocument()
  expect(within(detail).getByText('−20 điểm')).toBeInTheDocument()
  expect(within(detail).getByText('Trễ 35 phút')).toBeInTheDocument()
  expect(within(detail).getByText(content => content.includes('70/100 điểm'))).toBeInTheDocument()
  fireEvent.click(within(detail).getByRole('button',{name:'Đóng chi tiết'}))
  expect(screen.queryByRole('region',{name:'Chi tiết chuyên cần'})).not.toBeInTheDocument()
})
it('clears the previous employee detail when switching months',async()=>{
  render(<DiligencePage />);await screen.findByText('An')
  fireEvent.click(screen.getByRole('button',{name:'Xem chi tiết An'}));await screen.findByText('Ca sáng')
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
