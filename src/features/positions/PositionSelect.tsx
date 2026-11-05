import { useEffect, useState } from 'react'
import { getPosition, listPositions } from './api'
import type { Position, PositionPage } from './api'

export function PositionSelect({ id, label, value, onChange, disabled = false, required = false, currentId = null }: {
  id: string; label: string; value: string; onChange: (id: string) => void; disabled?: boolean; required?: boolean; currentId?: string | null
}) {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PositionPage | null>(null)
  const [selected, setSelected] = useState<Position | null>(null)
  const [error, setError] = useState('')
  const [selectedError, setSelectedError] = useState('')
  const [revision, retry] = useState(0)
  useEffect(() => {
    let active = true
    setData(null); setError('')
    listPositions(page, 'true').then(result => { if (active) setData(result) })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được vị trí.') })
    return () => { active = false }
  }, [page, revision])
  useEffect(() => {
    let active = true
    setSelected(null); setSelectedError('')
    if (value) getPosition(value).then(result => { if (active) setSelected(result) })
      .catch((failure: unknown) => { if (active) setSelectedError(failure instanceof Error ? failure.message : 'Không tải được vị trí đã chọn.') })
    return () => { active = false }
  }, [value, revision])
  const items = data?.items ?? []
  const extra = selected && selected.id === value && !items.some(item => item.id === selected.id) ? selected : null
  return <div className="position-select"><label htmlFor={id}>{label}</label>
    <select id={id} value={value} required={required} disabled={disabled || !data || !!error || !!selectedError} onChange={event => onChange(event.target.value)}>
      <option value="">{required ? 'Chọn vị trí' : 'Chưa chọn vị trí'}</option>
      {extra && <option value={extra.id} disabled={!extra.active && extra.id !== currentId}>{extra.name}{!extra.active ? ' (Ngừng sử dụng)' : ''}</option>}
      {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    {!data && !error && <small role="status">Đang tải vị trí…</small>}
    {(error || selectedError) && <div role="alert"><small>{error || selectedError}</small><button type="button" disabled={disabled} onClick={() => retry(value => value + 1)}>Thử lại danh mục</button></div>}
    {data && data.totalElements === 0 && <small>Chưa có vị trí đang sử dụng. Liên hệ quản lý tạo trong mục Vị trí.</small>}
    {data && data.totalPages > 1 && <div className="position-paging"><button type="button" disabled={disabled || page === 0} onClick={() => setPage(value => value - 1)}>Vị trí trước</button><small>Trang {page + 1}/{data.totalPages}</small><button type="button" disabled={disabled || page + 1 >= data.totalPages} onClick={() => setPage(value => value + 1)}>Vị trí tiếp</button></div>}
  </div>
}
