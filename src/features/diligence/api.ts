import { request } from '../../shared/api/client'

export interface Policy { initialScore:number; rewardThreshold:number; graceMinutes:number; under15Penalty:number; under30Penalty:number; from30Penalty:number; dailyCap:number; explanationHours:number; halfDayPenalty:number }
export interface Summary { employeeId:string; employeeName:string; accountLocked:boolean; score:number; deductedPoints:number; checkInCount:number; lateCount:number; rewardStatus:'ELIGIBLE'|'INELIGIBLE'; absenceCount:number; missingCount:number; pendingExplanationCount:number; disciplinaryReferral:boolean }
export type Absence='AUTO'|'APPROVED_LEAVE'|'LATE_APPROVED'|'UNEXCUSED'
export type Missing='AUTO'|'TIMELY_EXPLANATION'|'LATE_EXPLANATION'|'SYSTEM_CONFIRMED'
export interface Review { employeeId:string; workDate:string; absence:Absence; earlyLeaveApproved:boolean; missing:Missing; note:string; revision:number; reviewedBy:string|null; reviewedAt:string|null }
export interface Shift { id:string; name:string; startsAt:string; endsAt:string; checkInAt:string|null; checkOutAt:string|null }
export interface Component { code:string; points:number; scheduleId:string|null }
export interface DayEntry { workDate:string; shifts:Shift[]; components:Component[]; rawPoints:number; points:number; capped:boolean; disciplinaryReferral:boolean; pendingExplanation:boolean; explanationDeadline:string; absent:boolean; missing:boolean; review:Review }
interface Month { month:string; timezone:string; finalized:boolean; asOf:string; policy:Policy; page:number; size:number; totalElements:number; totalPages:number }
export interface MonthPage extends Month { items:Summary[] }
export interface EmployeeMonth extends Month { employee:Summary; items:DayEntry[] }
export interface ReviewRequest { absence:Absence; earlyLeaveApproved:boolean; missing:Missing; note:string; revision:number }
export interface ReviewHistory { review:Review; history:{revision:number;actorId:string;actorName:string;at:string;snapshot:Review}[] }
const employeePath=(id:string)=>'/diligence/employees/'+encodeURIComponent(id)
export function loadDiligence(month:string,q:string,page:number,signal:AbortSignal){return request<MonthPage>('/diligence?'+new URLSearchParams({month,q,page:String(page),size:'20'}),{signal})}
export function loadEmployeeDiligence(id:string,month:string,page:number,signal:AbortSignal){return request<EmployeeMonth>(employeePath(id)+'?'+new URLSearchParams({month,page:String(page),size:'20'}),{signal})}
export function loadReview(id:string,date:string,signal:AbortSignal){return request<ReviewHistory>(employeePath(id)+'/days/'+encodeURIComponent(date)+'/review',{signal})}
export function saveReview(id:string,date:string,body:ReviewRequest){return request<Review>(employeePath(id)+'/days/'+encodeURIComponent(date)+'/review',{method:'PUT',body:JSON.stringify(body)})}
