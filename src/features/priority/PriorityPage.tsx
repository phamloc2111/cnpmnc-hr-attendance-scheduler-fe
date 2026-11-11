import { useEffect, useState } from 'react'
import { listAccounts } from '../accounts/api'
import type { Account } from '../accounts/types'
import { listPositions } from '../positions/api'
import type { Position } from '../positions/api'
import { vietnamToday } from '../../shared/utils/dates'
import { loadPriorityRatings, loadPriorityTeam, savePriorityRating, savePriorityWeights } from './api'
import type { Team, Weights } from './api'
import './priority.css'

const labels: Record<keyof Weights, string> = {
  punctuality: 'Đúng giờ', hourBalance: 'Cân bằng giờ', tenure: 'Thâm niên', positionMatch: 'Phù hợp vị trí', managerRating: 'Đánh giá quản lý',
}
const keys = Object.keys(labels) as (keyof Weights)[]
export function PriorityPage({ role }: { role: 'MANAGER' | 'ADMIN' }) {
  const [week, setWeek] = useState(vietnamToday())
  const [managerId, setManagerId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [managers, setManagers] = useState<Account[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [data, setData] = useState<Team | null>(null)
  const [weights, setWeights] = useState<Weights | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [revision, refresh] = useState(0)
  useEffect(() => {
    let active = true
    void listPositions(0, 'true').then(value => { if (active) setPositions(value.items) }).catch(() => { if (active) setPositions([]) })
    if (role === 'ADMIN') void listAccounts({ q: '', role: 'MANAGER', locked: 'false', page: 0 }, 100).then(value => {
      if (active) setManagers(value.items)
    }).catch(failure => { if (active) setError(message(failure)) })
    return () => { active = false }
  }, [role])
  useEffect(() => {
    if (role === 'ADMIN' && !managerId) { setData(null); setWeights(null); return }
    let active = true
    setError('')
    void Promise.all([loadPriorityTeam(managerId || undefined, week, positionId || undefined), loadPriorityRatings(managerId || undefined)])
      .then(([team, nextRatings]) => { if (active) { setData(team); setWeights(team.weights); setRatings(nextRatings) } })
      .catch(failure => { if (active) setError(message(failure)) })
    return () => { active = false }
  }, [role, managerId, week, positionId, revision])
  const sum = weights ? keys.reduce((total, key) => total + weights[key], 0) : 0
  async function saveWeights() {
    if (!weights || sum !== 100) { setError('Tổng trọng số phải bằng 100%.'); return }
    setSaving(true); setError('')
    try { await savePriorityWeights(weights, managerId || undefined); setNotice('Đã lưu trọng số.'); refresh(value => value + 1) }
    catch (failure) { setError(message(failure)) }
    finally { setSaving(false) }
  }
  async function rate(employeeId: string, value: number) {
    setError('')
    try { await savePriorityRating(employeeId, value, managerId || undefined); setRatings(previous => ({ ...previous, [employeeId]: value })); refresh(next => next + 1) }
    catch (failure) { setError(message(failure)) }
  }
  return <main className="workspace priority-page">
    <div className="page-heading"><div><p className="eyebrow">XẾP LỊCH</p><h1>Điểm ưu tiên</h1><p className="muted">Xem điểm theo tuần để phân ca công bằng · Giờ Việt Nam (UTC+7).</p></div></div>
    <section className="account-card priority-panel">
      <div className="priority-filters">
        {role === 'ADMIN' && <label>Nhóm quản lý<select value={managerId} onChange={event => setManagerId(event.target.value)}><option value="">Chọn quản lý</option>{managers.map(manager => <option key={manager.id} value={manager.id}>{manager.displayName}</option>)}</select></label>}
        <label>Tuần<input type="date" min="1900-01-01" value={week} onChange={event => setWeek(event.target.value)} /></label>
        <label>Vị trí cần xếp<select value={positionId} onChange={event => setPositionId(event.target.value)}><option value="">Chưa chọn vị trí</option>{positions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}</select></label>
        <button type="button" onClick={() => refresh(value => value + 1)}>Tải lại</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      {weights && <div className="priority-weights"><h2>Trọng số của nhóm</h2><p className="muted">Tổng {sum}% · Cập nhật có hiệu lực ở lần tính tiếp theo.</p><div className="priority-weight-grid">{keys.map(key => <label key={key}>{labels[key]}<span><input type="number" min="0" max="100" value={weights[key]} onChange={event => setWeights({ ...weights, [key]: Number(event.target.value) })} />%</span></label>)}</div><button type="button" className="primary" disabled={saving || sum !== 100} onClick={() => void saveWeights()}>{saving ? 'Đang lưu…' : 'Lưu trọng số'}</button></div>}
      {data ? <><div className="priority-table-heading"><h2>Bảng điểm tuần {data.weekStart}</h2><small>Vắng không phép: −5 điểm/ngày trong 4 tuần tiếp, tối đa −20 điểm/tuần.</small></div><div className="table-scroll"><table className="priority-table"><thead><tr><th>Nhân viên</th><th>Điểm</th><th>Đúng giờ</th><th>Cân bằng giờ</th><th>Thâm niên</th><th>Phù hợp</th><th>Đánh giá</th><th>Trừ vắng</th><th>Giờ tuần trước</th><th>Giờ tuần này</th><th>Quản lý chấm</th></tr></thead><tbody>{data.items.map(row => <tr key={row.employeeId}><th scope="row">{row.employeeName}</th><td><strong>{row.score}</strong></td><td>{row.punctuality}</td><td>{row.hourBalance}</td><td>{row.tenure}</td><td>{row.positionMatch}</td><td>{row.managerRating}</td><td>{row.absencePenalty ? '−' + row.absencePenalty : '0'}</td><td>{hours(row.previousWeekMinutes)}</td><td>{hours(row.currentWeekMinutes)}</td><td><select aria-label={'Đánh giá ' + row.employeeName} value={ratings[row.employeeId] ?? 3} onChange={event => void rate(row.employeeId, Number(event.target.value))}>{[1,2,3,4,5].map(value => <option value={value} key={value}>{value}/5</option>)}</select></td></tr>)}</tbody></table></div>{!data.items.length && <p className="table-state">Nhóm chưa có nhân viên.</p>}</> : <p className="table-state" role="status">{role === 'ADMIN' && !managerId ? 'Chọn quản lý để xem điểm ưu tiên.' : 'Đang tính điểm ưu tiên…'}</p>}
    </section>
  </main>
}
function hours(minutes: number) { return (minutes / 60).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' giờ' }
function message(failure: unknown) { return failure instanceof Error ? failure.message : 'Không thể tải điểm ưu tiên.' }
