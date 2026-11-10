import { useEffect,useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { dateLabel,instantLabel,vietnamToday } from '../../shared/utils/dates'
import { categoryLabel,decideExplanation,loadManaged,statusLabel } from './api'
import type { Explanation,Page,Status } from './api'
import './explanations.css'

function range(month:string){const today=vietnamToday();const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);return {from:month+'-01',to:last>today?today:last}}
export function ManagementExplanationsPage(){
  const [month,setMonth]=useState(()=>vietnamToday().slice(0,7)),[status,setStatus]=useState<Status|''>('PENDING'),[page,setPage]=useState(0),[revision,refresh]=useState(0)
  const [data,setData]=useState<Page<Explanation>|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState<Explanation|null>(null)
  const [approve,setApprove]=useState(true),[reason,setReason]=useState(''),[exempt,setExempt]=useState(false),[saving,setSaving]=useState(false)
  useEffect(()=>{const {from,to}=range(month);let active=true;setData(null);setError('');loadManaged(from,to,status||undefined,page).then(value=>{if(active)setData(value)}).catch((failure:unknown)=>{if(active)setError(failure instanceof Error?failure.message:'Không tải được giải trình.')});return()=>{active=false}},[month,status,page,revision])
  function choose(item:Explanation,approved:boolean){setSelected(item);setApprove(approved);setReason('');setExempt(false);setError('')}
  async function submit(event:React.FormEvent){event.preventDefault();if(!selected)return;setSaving(true);setError('');try{await decideExplanation(selected.id,approve,reason,exempt);setSelected(null);refresh(value=>value+1)}catch(failure){setError(failure instanceof Error?failure.message:'Không xử lý được giải trình.')}finally{setSaving(false)}}
  return <main className="workspace explanation-page"><div className="page-heading"><div><p className="eyebrow">CHẤM CÔNG</p><h1>Duyệt giải trình</h1><p className="muted">Xem lý do của nhân viên và quyết định theo dữ liệu chấm công. Nhân viên sẽ thấy kết quả xử lý.</p></div></div>
    <section className="account-card"><div className="explanation-toolbar"><label>Tháng <input type="month" value={month} max={vietnamToday().slice(0,7)} onChange={event=>{setMonth(event.target.value);setPage(0)}}/></label><label>Trạng thái <select value={status} onChange={event=>{setStatus(event.target.value as Status|'');setPage(0)}}><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option><option value="">Tất cả</option></select></label><button onClick={()=>refresh(value=>value+1)}>Tải lại</button></div>
      {error&&!selected&&<p role="alert" className="error explanation-alert">{error}</p>}
      {!data&&!error?<p role="status" className="table-state">Đang tải giải trình…</p>:data&&!data.items.length?<p className="table-state">Không có giải trình phù hợp.</p>:data&&<><ul className="explanation-list">{data.items.map(item=><li key={item.id}><div><strong>{item.employeeName} · {categoryLabel[item.category]}</strong><p>{dateLabel(item.workDate)} · Gửi {instantLabel(item.submittedAt)}</p><p>{item.reason}</p>{item.decisionReason&&<small>Lý do xử lý: {item.decisionReason}</small>}</div><span className={'explanation-status status-'+item.status}>{statusLabel[item.status]}</span>{item.status==='PENDING'&&<div className="explanation-actions"><button onClick={()=>choose(item,true)}>Duyệt</button><button onClick={()=>choose(item,false)}>Từ chối</button></div>}</li>)}</ul><div className="pagination"><button disabled={!page} onClick={()=>setPage(value=>value-1)}>Trang trước</button><span>Trang {page+1}/{Math.max(1,data.totalPages)}</span><button disabled={page+1>=data.totalPages} onClick={()=>setPage(value=>value+1)}>Trang sau</button></div></>}
    </section>
    {selected&&<Modal title={`${approve?'Duyệt':'Từ chối'} giải trình · ${selected.employeeName}`} busy={saving} onClose={()=>{setSelected(null);setError('')}}>
      <div className="explanation-form"><form onSubmit={submit}>
        <p>{categoryLabel[selected.category]} ngày {dateLabel(selected.workDate)}: {selected.reason}</p>
        {approve&&selected.category==='LATE'&&<label className="explanation-checkbox"><input type="checkbox" checked={exempt} onChange={event=>setExempt(event.target.checked)}/>Xác nhận nguyên nhân được miễn điểm trễ</label>}
        <label>{approve?'Căn cứ xử lý':'Lý do từ chối'}<textarea required={!approve||exempt} minLength={!approve||exempt?10:undefined} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} placeholder={approve?'Ghi căn cứ nếu miễn điểm':'Nêu rõ lý do từ chối cho nhân viên'}/></label>
        {error&&<p role="alert" className="error">{error}</p>}
        <div className="explanation-actions"><button type="button" disabled={saving} onClick={()=>{setSelected(null);setError('')}}>Hủy</button><button disabled={saving||((!approve||exempt)&&reason.trim().length<10)}>{saving?'Đang lưu…':approve?'Xác nhận duyệt':'Xác nhận từ chối'}</button></div>
      </form></div>
    </Modal>}
  </main>
}
