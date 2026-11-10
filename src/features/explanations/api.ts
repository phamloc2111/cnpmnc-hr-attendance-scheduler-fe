import { request } from '../../shared/api/client'

export type Category='LATE'|'MISSING_CHECK_IN'|'MISSING_CHECK_OUT'|'INVALID'
export type Status='PENDING'|'APPROVED'|'REJECTED'
export interface Explanation { id:string;scheduleId:string;employeeId:string;employeeName:string;workDate:string;category:Category;attendanceRecordId:string|null;reason:string;submittedAt:string;status:Status;decisionReason:string|null;exemptLatePenalty:boolean;decidedBy:string|null;decidedAt:string|null }
export interface Candidate { scheduleId:string;workDate:string;shiftName:string;startsAt:string;endsAt:string;category:Category;attendanceRecordId:string|null;explanation:Explanation|null }
export interface Page<T> { items:T[];page:number;size:number;totalElements:number;totalPages:number }
const base='/attendance/explanations'
function query(from:string,to:string,page:number,size=20,status?:Status){return '?'+new URLSearchParams({...{from,to,page:String(page),size:String(size)},...(status?{status}:{})})}
export function loadCandidates(from:string,to:string,page:number){return request<Page<Candidate>>(base+'/candidates'+query(from,to,page))}
export function loadMine(from:string,to:string,page:number){return request<Page<Explanation>>(base+'/mine'+query(from,to,page))}
export function submitExplanation(candidate:Candidate,reason:string){return request<Explanation>(base,{method:'POST',body:JSON.stringify({scheduleId:candidate.scheduleId,category:candidate.category,attendanceRecordId:candidate.attendanceRecordId,reason:reason.trim()})})}
export function loadManaged(from:string,to:string,status:Status|undefined,page:number){return request<Page<Explanation>>(base+query(from,to,page,20,status))}
export function decideExplanation(id:string,approved:boolean,reason:string,exemptLatePenalty:boolean){return request<Explanation>(base+'/'+encodeURIComponent(id)+'/decision',{method:'PATCH',body:JSON.stringify({approved,reason:reason.trim(),exemptLatePenalty})})}
export const categoryLabel:Record<Category,string>={LATE:'Đi trễ',MISSING_CHECK_IN:'Thiếu giờ vào',MISSING_CHECK_OUT:'Thiếu giờ ra',INVALID:'Lượt chấm không hợp lệ'}
export const statusLabel:Record<Status,string>={PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Từ chối'}
