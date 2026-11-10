import { useEffect,useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { dateLabel,instantLabel,vietnamToday } from '../../shared/utils/dates'
import { categoryLabel,loadCandidates,loadMine,statusLabel,submitExplanation } from './api'
import type { Candidate,Explanation,Page } from './api'
import './explanations.css'

function range(month:string){const today=vietnamToday();const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);return {from:month+'-01',to:last>today?today:last}}
function errorText(error:unknown){return error instanceof Error?error.message:'Không thể tải giải trình. Vui lòng thử lại.'}
export function ExplanationPage(){
  const [month,setMonth]=useState(()=>vietnamToday().slice(0,7)),[page,setPage]=useState(0),[minePage,setMinePage]=useState(0),[revision,refresh]=useState(0)
  const [candidates,setCandidates]=useState<Page<Candidate>|null>(null),[mine,setMine]=useState<Page<Explanation>|null>(null)
  const [error,setError]=useState(''),[selected,setSelected]=useState<Candidate|null>(null),[reason,setReason]=useState(''),[saving,setSaving]=useState(false)
  useEffect(()=>{const {from,to}=range(month);let active=true;setError('');setCandidates(null);setMine(null)
    Promise.all([loadCandidates(from,to,page),loadMine(from,to,minePage)]).then(([rows,own])=>{if(active){setCandidates(rows);setMine(own)}}).catch((failure:unknown)=>{if(active)setError(errorText(failure))});return()=>{active=false}
  },[month,page,minePage,revision])
  async function submit(event:React.FormEvent){event.preventDefault();if(!selected)return;setSaving(true);setError('');try{await submitExplanation(selected,reason);setSelected(null);setReason('');setMinePage(0);refresh(value=>value+1)}catch(failure){setError(errorText(failure))}finally{setSaving(false)}}
  return <main className="workspace explanation-page"><div className="page-heading"><div><p className="eyebrow">CHẤM CÔNG</p><h1>Giải trình chấm công</h1><p className="muted">Gửi lý do cho ca đi trễ, quên chấm hoặc lượt chấm không hợp lệ. Kết quả duyệt hiển thị tại đây.</p></div></div>
    <section className="account-card"><div className="explanation-toolbar"><label>Tháng <input type="month" value={month} max={vietnamToday().slice(0,7)} onChange={event=>{setMonth(event.target.value);setPage(0);setMinePage(0);setSelected(null)}}/></label><button onClick={()=>refresh(value=>value+1)}>Tải lại</button></div>
      {error&&!selected&&<p role="alert" className="error explanation-alert">{error}</p>}
      {!candidates&&!error?<p role="status" className="table-state">Đang tải các ca cần giải trình…</p>:candidates&&<><h2 className="explanation-title">Ca có thể gửi giải trình</h2>{!candidates.items.length?<p className="table-state">Không có ca cần giải trình trong tháng này.</p>:<ul className="explanation-list">{candidates.items.map(item=><li key={item.scheduleId+item.category+(item.attendanceRecordId||'')}><div><strong>{categoryLabel[item.category]}</strong><p>{item.shiftName} · {dateLabel(item.workDate)} · {instantLabel(item.startsAt)}</p>{item.explanation&&<small>Đã gửi {instantLabel(item.explanation.submittedAt)} · {statusLabel[item.explanation.status]}</small>}</div>{!item.explanation&&<button onClick={()=>{setSelected(item);setReason('');setError('')}}>Gửi giải trình</button>}</li>)}</ul>}
        <div className="pagination"><button disabled={!page} onClick={()=>setPage(value=>value-1)}>Trang trước</button><span>Trang {page+1}/{Math.max(1,candidates.totalPages)}</span><button disabled={page+1>=candidates.totalPages} onClick={()=>setPage(value=>value+1)}>Trang sau</button></div></>}
      <h2 className="explanation-title">Giải trình của tôi</h2>{mine&&!mine.items.length&&<p className="table-state">Bạn chưa gửi giải trình trong tháng này.</p>}{mine&&!!mine.items.length&&<ul className="explanation-list">{mine.items.map(item=><li key={item.id}><div><strong>{categoryLabel[item.category]} · {dateLabel(item.workDate)}</strong><p>{item.reason}</p><small>Gửi {instantLabel(item.submittedAt)}</small>{item.decisionReason&&<p>Lý do xử lý: {item.decisionReason}</p>}{item.status==='APPROVED'&&item.category==='LATE'&&<small>{item.exemptLatePenalty?'Được miễn điểm trễ':'Điểm trễ giữ theo quy định'}</small>}</div><span className={'explanation-status status-'+item.status}>{statusLabel[item.status]}</span></li>)}</ul>}{mine&&<div className="pagination"><button disabled={!minePage} onClick={()=>setMinePage(value=>value-1)}>Trang trước</button><span>Trang {minePage+1}/{Math.max(1,mine.totalPages)}</span><button disabled={minePage+1>=mine.totalPages} onClick={()=>setMinePage(value=>value+1)}>Trang sau</button></div>}
    </section>
    {selected&&<Modal title={`Gửi giải trình · ${categoryLabel[selected.category]}`} busy={saving} onClose={()=>{setSelected(null);setError('')}}>
      <div className="explanation-form"><form onSubmit={submit}>
        <p>Ca {selected.shiftName} · {dateLabel(selected.workDate)} · {instantLabel(selected.startsAt)}–{instantLabel(selected.endsAt)}</p>
        <label>Lý do giải trình<textarea required minLength={10} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Ghi rõ sự việc và căn cứ để quản lý xem xét"/></label>
        {error&&<p role="alert" className="error">{error}</p>}
        <div className="explanation-actions"><button type="button" disabled={saving} onClick={()=>{setSelected(null);setError('')}}>Hủy</button><button disabled={saving||reason.trim().length<10}>{saving?'Đang gửi…':'Gửi giải trình'}</button></div>
      </form></div>
    </Modal>}
  </main>
}
