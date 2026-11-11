import { useEffect, useState } from 'react'
import { loadOwnMonth } from './api'
import type { OwnPeriod } from './api'
import { minutesLabel } from './EmployeeDiligencePage'
import './employee-diligence.css'

export function EmployeeDiligenceSummary({ month, revision }: { month: string; revision: number }) {
  const [data, setData] = useState<OwnPeriod | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('')
    loadOwnMonth(month, controller.signal).then(setData).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Không tải được chuyên cần.')
    })
    return () => controller.abort()
  }, [month, revision])
  return <section className="home-diligence-summary" aria-label="Giờ làm và điểm chuyên cần tháng hiện tại"><div><span>THÁNG NÀY</span><h2>Giờ làm và chuyên cần</h2></div>
    {error ? <p role="alert">{error} <a href="#/my-diligence">Xem chi tiết</a></p> : !data ? <p role="status">Đang tải số liệu…</p> : <div className="home-diligence-values"><div><strong>{minutesLabel(data.workedMinutes)}</strong><small>Giờ đã ghi nhận</small></div><div><strong>{data.score}<em>/100</em></strong><small>Điểm chuyên cần</small></div></div>}
    <a href="#/my-diligence">Xem theo tuần, tháng và lịch sử trừ điểm →</a>
  </section>
}
