import { Modal } from '../../shared/components/Modal'
import { dateLabel } from '../../shared/utils/dates'
import type { DraftShortage, DraftWarnings } from './types'

export function DraftWarningsModal({ warnings, error, onClose, onAssign }: {
  warnings: DraftWarnings | null; error: string; onClose: () => void;
  onAssign: (shortage: DraftShortage) => void
}) {
  return <Modal title="Cảnh báo bản nháp lịch" busy={false} onClose={onClose}>
    {error && <p role="alert" className="error">Không tải được cảnh báo bản nháp: {error}</p>}
    {!warnings && !error && <p role="status">Đang tải cảnh báo…</p>}
    {warnings && !warnings.draftExists && <p>Chưa có bản nháp lịch cho tuần này.</p>}
    {warnings?.draftExists && <div className="draft-shortages">
      {warnings.shortages.length === 0 && warnings.overtime.length === 0 &&
        <p>Không có ca đã chọn thiếu người hoặc nhân viên vượt giờ.</p>}
      {warnings.shortages.length > 0 && <><h3>Ca đã chọn thiếu người ({warnings.missingCount} vị trí)</h3>
        <ul>{warnings.shortages.map(shortage => <li key={shortage.workDate + shortage.shiftTemplateId}>
          <span>{dateLabel(shortage.workDate)} · {shortage.shiftName} · thiếu {shortage.missingCount} người</span>
          <button onClick={() => onAssign(shortage)}>Gán tay</button>
        </li>)}</ul></>}
      {warnings.overtime.length > 0 && <><h3>Nhân viên vượt giờ</h3><ul>{warnings.overtime.map(item =>
        <li key={item.employeeId}>{item.employeeName} · {item.weeklyMinutes} phút/tuần · vượt {item.exceededMinutes} phút (tối đa {warnings.maxWeeklyMinutes} phút)</li>)}</ul></>}
    </div>}
    <div className="modal-actions"><button onClick={onClose}>Đóng</button></div>
  </Modal>
}
