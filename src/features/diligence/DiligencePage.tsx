import { useEffect, useState } from 'react'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { dateLabel, instantLabel, vietnamToday } from '../../shared/utils/dates'
import { loadDiligence, loadEmployeeDiligence } from './api'
import type { EmployeeMonth, MonthPage, Policy, Summary } from './api'
import './diligence.css'

export function DiligencePage() {
  const [month, setMonth] = useState(() => vietnamToday().slice(0, 7))
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0)
  const [data, setData] = useState<MonthPage | null>(null), [error, setError] = useState(''), [revision, refresh] = useState(0)
  const [selected, setSelected] = useState<string | null>(null), [detailPage, setDetailPage] = useState(0)
  const [detail, setDetail] = useState<EmployeeMonth | null>(null), [detailError, setDetailError] = useState('')
  useEffect(() => {
    const timer = window.setInterval(() => refresh(value => value + 1), 60000)
    function focus() { refresh(value => value + 1) }
    window.addEventListener('focus', focus)
    return () => { clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [])
  useEffect(() => {
    const controller = new AbortController(); setError(''); setData(null)
    loadDiligence(month, search, page, controller.signal).then(value => { if (!controller.signal.aborted) setData(value) })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(message(failure)) })
    return () => controller.abort()
  }, [month, search, page, revision])
  useEffect(() => {
    setDetail(null); setDetailError('')
    if (!selected) return
    const controller = new AbortController()
    loadEmployeeDiligence(selected, month, detailPage, controller.signal).then(value => { if (!controller.signal.aborted) setDetail(value) })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setDetailError(message(failure)) })
    return () => controller.abort()
  }, [selected, month, detailPage, revision])
  function changeMonth(value: string) { if (value) { setMonth(value); setPage(0); setSelected(null) } }
  const current = vietnamToday().slice(0, 7)
  return <main className="workspace diligence-page">
    <div className="page-heading"><div><p className="eyebrow">CHUYÊN CẦN</p><h1>Điểm chuyên cần</h1><p className="muted">Theo dõi điểm theo tháng và điều kiện thưởng của nhân viên. Giờ Việt Nam (UTC+7).</p></div></div>
    <section className="diligence-note"><HomeIcon name="check" size={25} /><div><strong>Mỗi tháng bắt đầu từ 100 điểm</strong><p>Từ 90 điểm đạt điều kiện thưởng chuyên cần. Điểm được tính từ lượt chấm vào hợp lệ và tự tải lại mỗi phút. Hệ thống không tính tiền thưởng.</p></div></section>
    <section className="account-card">
      <form className="diligence-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setPage(0); setSelected(null) }}>
        <div><label htmlFor="diligence-month">Tháng tính điểm</label><input id="diligence-month" type="month" min="1900-01" max={current} value={month} onChange={event => changeMonth(event.target.value)} /></div>
        <div><label htmlFor="diligence-search">Tìm nhân viên</label><input id="diligence-search" maxLength={200} value={query} placeholder="Tên hoặc email nhân viên" onChange={event => setQuery(event.target.value)} /></div>
        <button>Tìm kiếm</button><button type="button" onClick={() => changeMonth(current)}>Tháng này</button><button type="button" onClick={() => refresh(value => value + 1)}>Tải lại</button>
      </form>
      {error ? <div className="table-state"><p className="error" role="alert">{error}</p><button onClick={() => refresh(value => value + 1)}>Thử lại</button></div> : !data ? <p className="table-state" role="status">Đang tính điểm chuyên cần…</p> : <>
        <div className="diligence-month-status"><strong>{data.finalized ? 'Kết quả cuối tháng' : 'Điểm tạm tính trong tháng'} · {monthLabel(data.month)}</strong><small>Cập nhật {instantLabel(data.asOf)}</small></div>
        <PolicyNote policy={data.policy} />
        {!data.items.length ? <div className="table-state"><h2>Chưa có nhân viên phù hợp</h2><p>Thử từ khóa khác hoặc kiểm tra phân công quản lý.</p></div> : <ul className="diligence-list">{data.items.map(employee => <li key={employee.employeeId}>
          <span className="diligence-avatar"><HomeIcon name="user" size={23} /></span><div className="diligence-person"><h2>{employee.employeeName}</h2><p>{employee.checkInCount} lượt vào ca · {employee.lateCount} lần trễ bị trừ điểm</p>{employee.accountLocked && <small>Tài khoản đang khóa</small>}</div>
          <div className="diligence-score" aria-label={'Điểm của ' + employee.employeeName}><strong>{employee.score}</strong><span>/ 100</span><small>Trừ {employee.deductedPoints} điểm</small></div>
          <Reward employee={employee} finalized={data.finalized} /><button aria-label={'Xem chi tiết ' + employee.employeeName} onClick={() => { setSelected(employee.employeeId); setDetailPage(0) }}>Chi tiết</button>
        </li>)}</ul>}
        <Pager page={page} totalPages={data.totalPages} onChange={setPage} label={data.totalElements + ' nhân viên'} />
      </>}
    </section>
    {selected && <section className="account-card diligence-detail" aria-label="Chi tiết chuyên cần">
      <div className="diligence-detail-heading"><h2>Chi tiết điểm chuyên cần</h2><button onClick={() => setSelected(null)}>Đóng chi tiết</button></div>
      {detailError ? <div className="table-state"><p role="alert" className="error">{detailError}</p><button onClick={() => refresh(value => value + 1)}>Thử lại chi tiết</button></div> : !detail ? <p className="table-state" role="status">Đang tải chi tiết…</p> : <>
        <div className="diligence-detail-summary"><div><h3>{detail.employee.employeeName}</h3><p>{monthLabel(detail.month)} · {detail.employee.score}/100 điểm · Trừ {detail.employee.deductedPoints} điểm</p></div><Reward employee={detail.employee} finalized={detail.finalized} /></div>
        {!detail.items.length ? <div className="table-state"><h3>Chưa có lượt chấm vào trong tháng</h3><p>Điểm bắt đầu là 100. Vắng mặt, về sớm và quên chấm công chưa tự trừ điểm.</p></div> : <ul className="diligence-entries">{detail.items.map(entry => <li key={entry.scheduleId}><div><h3>{entry.shiftName}</h3><p>{dateLabel(entry.workDate)} · Bắt đầu {instantLabel(entry.startsAt)}</p><small>Chấm vào {instantLabel(entry.checkInAt)}</small></div><div><strong>{entry.deductedPoints ? '−' + entry.deductedPoints + ' điểm' : 'Không trừ điểm'}</strong><small>{entry.lateSeconds > 0 ? 'Trễ ' + delayLabel(entry.lateSeconds) : 'Đúng giờ'}</small></div></li>)}</ul>}
        <Pager page={detailPage} totalPages={detail.totalPages} onChange={setDetailPage} label={detail.totalElements + ' lượt chấm vào'} />
      </>}
    </section>}
  </main>
}
function PolicyNote({ policy }: { policy: Policy }) {
  return <div className="diligence-policy"><p>Trễ dưới 15 phút: −{policy.under15Penalty} · Từ 15 đến dưới 30 phút: −{policy.under30Penalty} · Từ 30 phút: −{policy.from30Penalty} điểm.</p><small>{policy.graceMinutes ? 'Ân hạn đến ' + policy.graceMinutes + ' phút, sau đó tính độ trễ từ giờ bắt đầu ca.' : 'Không có thời gian ân hạn.'} Vắng mặt, về sớm và quên chấm công chưa tự trừ điểm. Ca qua đêm tính theo ngày bắt đầu ca.</small></div>
}
function Reward({ employee, finalized }: { employee: Summary; finalized: boolean }) {
  return <span className={'diligence-reward ' + (employee.rewardStatus === 'ELIGIBLE' ? 'eligible' : 'ineligible')}>{!finalized && 'Tạm tính: '}{employee.rewardStatus === 'ELIGIBLE' ? 'Đạt thưởng' : 'Không đạt thưởng'}</span>
}
function Pager({ page, totalPages, onChange, label }: { page: number; totalPages: number; onChange: (page: number) => void; label: string }) {
  return <div className="pagination"><button disabled={!page} onClick={() => onChange(page - 1)}>Trang trước</button><span>Trang {page + 1} / {Math.max(1, totalPages)} · {label}</span><button disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Trang sau</button></div>
}
function monthLabel(month: string) { return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T00:00:00Z')) }
function delayLabel(seconds: number) { const minutes = Math.floor(seconds / 60), rest = seconds % 60; return (minutes ? minutes + ' phút' : '') + (rest ? (minutes ? ' ' : '') + rest + ' giây' : '') }
function message(error: unknown) { return error instanceof Error ? error.message : 'Không tải được điểm chuyên cần. Vui lòng thử lại.' }
