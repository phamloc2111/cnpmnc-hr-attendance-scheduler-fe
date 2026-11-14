import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../shared/components/Modal'
import { addDays, dateLabel, timeLabel } from '../../shared/utils/dates'
import { listPositions } from '../positions/api'
import { generateWeeklyDraft, listShifts } from './api'
import type { DraftGenerationResult, DraftSlot, Shift } from './types'

const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']
const slotKey = (slot: DraftSlot) => `${slot.workDate}|${slot.shiftTemplateId}`

export function DraftSelectionModal({ week, onClose, onSaved }: {
  week: string; onClose: () => void; onSaved: (result: DraftGenerationResult) => void
}) {
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingError, setLoadingError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dates = weekdays.map((label, index) => ({ label, date: addDays(week, index) }))

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const allShifts: Shift[] = []
        let shiftPage = 0
        let shiftPages = 1
        while (shiftPage < shiftPages) {
          const response = await listShifts(shiftPage, 100)
          allShifts.push(...response.items)
          shiftPages = response.totalPages
          shiftPage++
        }
        const activePositions = new Set<string>()
        let positionPage = 0
        let positionPages = 1
        while (positionPage < positionPages) {
          const response = await listPositions(positionPage, 'true')
          response.items.filter(position => position.active).forEach(position => activePositions.add(position.id))
          positionPages = response.totalPages
          positionPage++
        }
        if (active) setShifts(allShifts.filter(shift => shift.requiredPositionId &&
          activePositions.has(shift.requiredPositionId) && shift.requiredHeadcount > 0))
      } catch (failure: unknown) {
        if (active) setLoadingError(failure instanceof Error ? failure.message : 'Không tải được mẫu ca. Vui lòng thử lại.')
      }
    }
    void load()
    return () => { active = false }
  }, [])

  function toggle(slot: DraftSlot) {
    const key = slotKey(slot)
    setSelected(previous => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !shifts || selected.size === 0) return
    const slots = dates.flatMap(({ date }) => shifts.filter(shift =>
      selected.has(slotKey({ workDate: date, shiftTemplateId: shift.id })))
      .map(shift => ({ workDate: date, shiftTemplateId: shift.id })))
    setBusy(true); setError('')
    try { onSaved(await generateWeeklyDraft(week, slots)) }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'Không tạo được bản nháp.') }
    finally { setBusy(false) }
  }

  return <Modal title="Chọn ngày và ca cần xếp" busy={busy} onClose={onClose}>
    <p>Tuần {dateLabel(week)} – {dateLabel(addDays(week, 6))}. Chọn từng ô ngày–ca; chỉ các ô đã chọn mới được xếp vào bản nháp.</p>
    {loadingError && <p role="alert" className="error">{loadingError}</p>}
    {!shifts && !loadingError && <p role="status">Đang tải mẫu ca và vị trí…</p>}
    {shifts?.length === 0 && <p>Không có mẫu ca với vị trí đang hoạt động. Hãy tạo mẫu ca trước khi xếp lịch.</p>}
    {shifts && shifts.length > 0 && <form onSubmit={event => { void submit(event) }}>
      <div className="draft-selection-toolbar"><span>Đã chọn {selected.size} ô ngày–ca</span>
        <button type="button" disabled={busy} onClick={() => setSelected(new Set(dates.flatMap(({ date }) => shifts.map(shift =>
          slotKey({ workDate: date, shiftTemplateId: shift.id })))))}>Chọn tất cả</button>
        <button type="button" disabled={busy || selected.size === 0} onClick={() => setSelected(new Set())}>Bỏ chọn</button>
      </div>
      <div className="draft-selection-scroll"><table className="draft-selection-table"><thead><tr><th scope="col">Ngày</th>
        {shifts.map(shift => <th key={shift.id} scope="col">{shift.name}<small>{timeLabel(shift.startTime)}–{timeLabel(shift.endTime)} · {shift.requiredPosition} · cần {shift.requiredHeadcount}</small></th>)}
      </tr></thead><tbody>{dates.map(({ label, date }) => <tr key={date}><th scope="row">{label}<small>{dateLabel(date)}</small></th>
        {shifts.map(shift => <td key={shift.id}><input type="checkbox" aria-label={`${label} ${dateLabel(date)} · ${shift.name}`}
          checked={selected.has(slotKey({ workDate: date, shiftTemplateId: shift.id }))} disabled={busy}
          onChange={() => toggle({ workDate: date, shiftTemplateId: shift.id })} /></td>)}
      </tr>)}</tbody></table></div>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions"><button type="button" disabled={busy} onClick={onClose}>Hủy</button>
        <button className="primary" type="submit" disabled={busy || selected.size === 0}>{busy ? 'Đang tạo nháp…' : 'Tạo bản nháp'}</button></div>
    </form>}
  </Modal>
}
