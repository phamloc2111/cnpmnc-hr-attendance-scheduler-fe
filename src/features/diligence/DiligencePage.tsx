import { useEffect,useState } from 'react'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { dateLabel,instantLabel,vietnamToday } from '../../shared/utils/dates'
import { loadDiligence,loadEmployeeDiligence,loadReview,saveReview } from './api'
import type { Absence,DayEntry,EmployeeMonth,Missing,MonthPage,Policy,Review,ReviewHistory,ReviewRequest,Summary } from './api'
import './diligence.css'

export function DiligencePage(){
  const [month,setMonth]=useState(()=>vietnamToday().slice(0,7))
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0)
  const [data,setData]=useState<MonthPage|null>(null),[error,setError]=useState(''),[revision,refresh]=useState(0)
  const [selected,setSelected]=useState<string|null>(null),[detailPage,setDetailPage]=useState(0)
  const [detail,setDetail]=useState<EmployeeMonth|null>(null),[detailError,setDetailError]=useState('')
  const [reviewDay,setReviewDay]=useState<DayEntry|null>(null)
  useEffect(()=>{const timer=window.setInterval(()=>refresh(value=>value+1),60000);function focus(){refresh(value=>value+1)}window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus)}},[])
  useEffect(()=>{const controller=new AbortController();setError('');setData(null);loadDiligence(month,search,page,controller.signal).then(value=>{if(!controller.signal.aborted)setData(value)}).catch((failure:unknown)=>{if(!controller.signal.aborted)setError(message(failure))});return()=>controller.abort()},[month,search,page,revision])
  useEffect(()=>{setDetail(null);setDetailError('');setReviewDay(null);if(!selected)return;const controller=new AbortController();loadEmployeeDiligence(selected,month,detailPage,controller.signal).then(value=>{if(!controller.signal.aborted)setDetail(value)}).catch((failure:unknown)=>{if(!controller.signal.aborted)setDetailError(message(failure))});return()=>controller.abort()},[selected,month,detailPage,revision])
  function changeMonth(value:string){if(value){setMonth(value);setPage(0);setSelected(null)}}
  const current=vietnamToday().slice(0,7)
  return <main className="workspace diligence-page">
    <div className="page-heading"><div><p className="eyebrow">CHUYÊN CẦN</p><h1>Điểm chuyên cần</h1><p className="muted">Theo dõi điểm theo tháng và điều kiện thưởng của nhân viên · Giờ Việt Nam (UTC+7).</p></div></div>
    <section className="diligence-note"><HomeIcon name="check" size={25}/><div><strong>Mỗi tháng bắt đầu từ 100 điểm</strong><p>Từ 80 điểm đạt điều kiện thưởng chuyên cần. Mỗi ngày trừ tối đa 20 điểm. Điểm tự cập nhật khi có dữ liệu chấm công hoặc xác nhận của quản lý.</p></div></section>
    <section className="account-card">
      <form className="diligence-filters" onSubmit={event=>{event.preventDefault();setSearch(query.trim());setPage(0);setSelected(null)}}>
        <div><label htmlFor="diligence-month">Tháng tính điểm</label><input id="diligence-month" type="month" min="1900-01" max={current} value={month} onChange={event=>changeMonth(event.target.value)}/></div>
        <div><label htmlFor="diligence-search">Tìm nhân viên</label><input id="diligence-search" maxLength={200} value={query} placeholder="Tên hoặc email nhân viên" onChange={event=>setQuery(event.target.value)}/></div>
        <button>Tìm kiếm</button><button type="button" onClick={()=>changeMonth(current)}>Tháng này</button><button type="button" onClick={()=>refresh(value=>value+1)}>Tải lại</button>
      </form>
      {error?<div className="table-state"><p className="error" role="alert">{error}</p><button onClick={()=>refresh(value=>value+1)}>Thử lại</button></div>:!data?<p className="table-state" role="status">Đang tính điểm chuyên cần…</p>:<>
        <div className="diligence-month-status"><strong>{data.finalized?'Kết quả cuối tháng':'Điểm tạm tính trong tháng'} · {monthLabel(data.month)}</strong><small>Cập nhật {instantLabel(data.asOf)}</small></div>
        <PolicyNote policy={data.policy}/>
        {!data.items.length?<div className="table-state"><h2>Chưa có nhân viên phù hợp</h2><p>Thử từ khóa khác hoặc kiểm tra phân công quản lý.</p></div>:<ul className="diligence-list">{data.items.map(employee=><li key={employee.employeeId}>
          <span className="diligence-avatar"><HomeIcon name="user" size={23}/></span><div className="diligence-person"><h2>{employee.employeeName}</h2><p>{employee.checkInCount} lượt vào ca · {employee.lateCount} lần trễ · {employee.absenceCount} ngày vắng · {employee.missingCount} ngày quên chấm</p>{employee.pendingExplanationCount>0&&<small>{employee.pendingExplanationCount} ngày chờ giải trình</small>}{employee.disciplinaryReferral&&<small> · Cần chuyển xử lý kỷ luật</small>}{employee.accountLocked&&<small>Tài khoản đang khóa</small>}</div>
          <div className="diligence-score" aria-label={'Điểm của '+employee.employeeName}><strong>{employee.score}</strong><span>/ 100</span><small>Trừ {employee.deductedPoints} điểm</small></div>
          <Reward employee={employee} finalized={data.finalized}/><button aria-label={'Xem chi tiết '+employee.employeeName} onClick={()=>{setSelected(employee.employeeId);setDetailPage(0)}}>Chi tiết</button>
        </li>)}</ul>}
        <Pager page={page} totalPages={data.totalPages} onChange={setPage} label={data.totalElements+' nhân viên'}/>
      </>}
    </section>
    {selected&&<section className="account-card diligence-detail" aria-label="Chi tiết chuyên cần">
      <div className="diligence-detail-heading"><h2>Chi tiết điểm chuyên cần</h2><button onClick={()=>setSelected(null)}>Đóng chi tiết</button></div>
      {detailError?<div className="table-state"><p role="alert" className="error">{detailError}</p><button onClick={()=>refresh(value=>value+1)}>Thử lại chi tiết</button></div>:!detail?<p className="table-state" role="status">Đang tải chi tiết…</p>:<>
        <div className="diligence-detail-summary"><div><h3>{detail.employee.employeeName}</h3><p>{monthLabel(detail.month)} · {detail.employee.score}/100 điểm · Trừ {detail.employee.deductedPoints} điểm</p></div><Reward employee={detail.employee} finalized={detail.finalized}/></div>
        {!detail.items.length?<div className="table-state"><h3>Chưa có ca làm trong tháng</h3><p>Điểm bắt đầu là 100.</p></div>:<ul className="diligence-entries">{detail.items.map(day=><li key={day.workDate} className="diligence-day"><div className="diligence-day-main"><h3>{dateLabel(day.workDate)}</h3><div className="diligence-shifts">{day.shifts.map(shift=><p key={shift.id}>{shift.name} · {instantLabel(shift.startsAt)}–{instantLabel(shift.endsAt)}<br/>Vào: {shift.checkInAt?instantLabel(shift.checkInAt):'Thiếu'} · Ra: {shift.checkOutAt?instantLabel(shift.checkOutAt):'Thiếu'}</p>)}</div><div className="diligence-components">{day.components.length?day.components.map((part,index)=><span key={index}>{componentLabel(part.code)}: {part.points?('−'+part.points):'0'} điểm</span>):<span>Chưa có lỗi</span>}</div>{day.pendingExplanation&&<small>Chờ giải trình đến {instantLabel(day.explanationDeadline)}</small>}{day.absent&&day.review.absence==='AUTO'&&<small>Vắng mặt tự ghi nhận · cần xác minh lý do</small>}{day.disciplinaryReferral&&<small>Cần chuyển xử lý kỷ luật từ ngày vắng thứ ba</small>}{day.capped&&<small>Trước giới hạn: {day.rawPoints} điểm · đã áp dụng trần 20 điểm/ngày</small>}</div><div className="diligence-day-actions"><strong>{day.points?'−'+day.points+' điểm':'Không trừ điểm'}</strong><button type="button" onClick={()=>setReviewDay(day)}>Xác minh</button></div></li>)}</ul>}
        <Pager page={detailPage} totalPages={detail.totalPages} onChange={setDetailPage} label={detail.totalElements+' ngày có ca'}/>
      </>}
    </section>}
    {selected&&reviewDay&&<ReviewPanel key={selected+reviewDay.workDate} employeeId={selected} day={reviewDay} onClose={()=>setReviewDay(null)} onSaved={()=>{setReviewDay(null);refresh(value=>value+1)}}/>}
  </main>
}
function ReviewPanel({employeeId,day,onClose,onSaved}:{employeeId:string;day:DayEntry;onClose:()=>void;onSaved:()=>void}){
  const [history,setHistory]=useState<ReviewHistory|null>(null),[current,setCurrent]=useState<Review>(day.review),[form,setForm]=useState<ReviewRequest>(()=>({...day.review,note:day.review.note||''}))
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('')
  useEffect(()=>{const controller=new AbortController();loadReview(employeeId,day.workDate,controller.signal).then(value=>{if(!controller.signal.aborted){setHistory(value);setCurrent(value.review);setForm({absence:value.review.absence,earlyLeaveApproved:value.review.earlyLeaveApproved,missing:value.review.missing,note:value.review.note,revision:value.review.revision})}}).catch((failure:unknown)=>{if(!controller.signal.aborted)setError(message(failure))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[employeeId,day.workDate])
  async function submit(event:React.FormEvent){event.preventDefault();setError('');setSaving(true);try{await saveReview(employeeId,day.workDate,form);onSaved()}catch(failure){setError(message(failure));if(failure instanceof Error&&'status' in failure&&(failure as {status:number}).status===409){const controller=new AbortController();try{const latest=await loadReview(employeeId,day.workDate,controller.signal);setHistory(latest);setCurrent(latest.review);setForm({absence:latest.review.absence,earlyLeaveApproved:latest.review.earlyLeaveApproved,missing:latest.review.missing,note:latest.review.note,revision:latest.review.revision})}catch{/* Preserve the conflict error. */}}}finally{setSaving(false)}}
  return <section className="account-card diligence-review" aria-label="Xác minh chuyên cần"><div className="diligence-detail-heading"><h2>Xác minh ngày {dateLabel(day.workDate)}</h2><button onClick={onClose}>Đóng</button></div>
    {loading?<p className="table-state" role="status">Đang tải xác minh…</p>:!history?<p className="table-state error" role="alert">{error||"Không tải được thông tin xác minh. Hãy đóng và thử lại."}</p>:<form onSubmit={submit}><p>Chọn sự việc đã xác nhận. Điểm sẽ được tính lại theo quy định; ghi rõ căn cứ trong ghi chú.</p>
      <div className="diligence-review-grid"><label>Nghỉ làm<select value={form.absence} onChange={event=>setForm({...form,absence:event.target.value as Absence,missing:'AUTO'})}><option value="AUTO">Tự xác định từ chấm công</option><option value="APPROVED_LEAVE">Nghỉ có phép (0 điểm)</option><option value="LATE_APPROVED">Báo nghỉ muộn được duyệt (5 điểm)</option><option value="UNEXCUSED">Nghỉ không phép</option></select></label>
      <label>Quên chấm công<select value={form.missing} onChange={event=>setForm({...form,missing:event.target.value as Missing,absence:'AUTO'})}><option value="AUTO">Tự xác định · chờ 48 giờ</option><option value="TIMELY_EXPLANATION">Giải trình đúng hạn</option><option value="LATE_EXPLANATION">Không giải trình đúng hạn (5 điểm)</option><option value="SYSTEM_CONFIRMED">Lỗi hệ thống đã xác nhận (0 điểm)</option></select></label></div>
      <label className="diligence-checkbox"><input type="checkbox" checked={form.earlyLeaveApproved} onChange={event=>setForm({...form,earlyLeaveApproved:event.target.checked})}/>Về sớm đã xin phép và được duyệt</label>
      <label className="diligence-note-field">Lý do và căn cứ xác nhận<textarea required minLength={10} maxLength={1000} value={form.note} onChange={event=>setForm({...form,note:event.target.value})} placeholder="Ví dụ: Đã duyệt đơn nghỉ phép ngày…"/></label>
      {error&&<p role="alert" className="error">{error}</p>}
      {current.revision>0&&<p className="muted">Xác nhận gần nhất: {instantLabel(current.reviewedAt!)} · phiên bản {current.revision}</p>}
      <div className="diligence-review-actions"><button type="button" onClick={onClose}>Hủy</button><button type="submit" disabled={saving}>{saving?'Đang lưu…':'Lưu xác minh'}</button></div>
    </form>}
    {!!history?.history.length&&<details><summary>Lịch sử xác minh ({history.history.length})</summary><ul>{history.history.map(item=><li key={item.revision}>{instantLabel(item.at)} · {item.actorName}: {item.snapshot.note}</li>)}</ul></details>}
  </section>
}
function componentLabel(code:string){return ({LATE:'Đi trễ',EARLY_LEAVE:'Về sớm',EARLY_APPROVED:'Về sớm đã duyệt',HALF_DAY_ABSENCE:'Về sớm quá nửa ca',ABSENCE_FIRST:'Nghỉ không phép lần đầu',ABSENCE_REPEATED:'Nghỉ không phép tiếp theo',DISCIPLINARY_REFERRAL:'Chuyển xử lý kỷ luật',APPROVED_LEAVE:'Nghỉ có phép',LATE_APPROVED_LEAVE:'Nghỉ báo muộn đã duyệt',MISSING_WARNING:'Quên chấm lần đầu',MISSING_REPEATED:'Quên chấm từ lần thứ ba',MISSING_LATE_EXPLANATION:'Quên chấm giải trình muộn',MISSING_PENDING:'Quên chấm đang chờ giải trình',MISSING_EXPIRED:'Quên chấm quá hạn giải trình',SYSTEM_CONFIRMED:'Lỗi hệ thống đã xác nhận'} as Record<string,string>)[code]||code}
function PolicyNote({policy}:{policy:Policy}){return <div className="diligence-policy"><p>Đi trễ/về sớm: ân hạn {policy.graceMinutes} phút · 6–15 phút: −5 · 16–30 phút: −10 · trên 30 phút: −20 điểm. Về sớm quá nửa ca: −{policy.halfDayPenalty}.</p><small>Nghỉ không phép: 20 điểm ngày đầu, 30 điểm từ ngày thứ hai trước giới hạn {policy.dailyCap} điểm/ngày; từ ngày liên tiếp thứ ba chuyển xử lý kỷ luật và không trừ thêm. Quên chấm: giải trình trong {policy.explanationHours} giờ sau ca cuối ngày. Điểm thưởng từ {policy.rewardThreshold}.</small></div>}
function Reward({employee,finalized}:{employee:Summary;finalized:boolean}){return <span className={'diligence-reward '+(employee.rewardStatus==='ELIGIBLE'?'eligible':'ineligible')}>{!finalized&&'Tạm tính: '}{employee.rewardStatus==='ELIGIBLE'?'Đạt thưởng':'Không đạt thưởng'}</span>}
function Pager({page,totalPages,onChange,label}:{page:number;totalPages:number;onChange:(page:number)=>void;label:string}){return <div className="pagination"><button disabled={!page} onClick={()=>onChange(page-1)}>Trang trước</button><span>Trang {page+1} / {Math.max(1,totalPages)} · {label}</span><button disabled={page+1>=totalPages} onClick={()=>onChange(page+1)}>Trang sau</button></div>}
function monthLabel(month:string){return new Intl.DateTimeFormat('vi-VN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'))}
function message(error:unknown){return error instanceof Error?error.message:'Không tải được điểm chuyên cần. Vui lòng thử lại.'}
