import { useEffect, useState } from 'react'
import { loadOwnPriority } from './api'
import type { Own } from './api'
import './priority.css'

export function OwnPriorityCard() {
  const [data, setData] = useState<Own | null>(null)
  useEffect(() => { let active = true; void loadOwnPriority().then(value => { if (active) setData(value) }).catch(() => {}); return () => { active = false } }, [])
  return data && <section className="priority-own-card"><span>Điểm ưu tiên tuần này</span><strong>{data.score}<small>/100</small></strong><p>Điểm dùng khi quản lý xếp ca, cập nhật theo dữ liệu chấm công và phân ca.</p></section>
}
