import { useEffect, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { dateLabel, instantLabel } from '../../shared/utils/dates'
import { listAttendanceRecords } from './api'
import {
  attendanceStatusLabels,
  attendanceTypeLabels,
  type AttendancePageResponse,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceType,
} from './types'
import './attendance.css'

function formatCoordinates(record: AttendanceRecord) {
  if (record.deviceLatitude === null || record.deviceLongitude === null) return null
  return `${record.deviceLatitude.toFixed(4)}, ${record.deviceLongitude.toFixed(4)}`
}

export function AttendancePage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<AttendanceStatus | ''>('')
  const [checkType, setCheckType] = useState<AttendanceType | ''>('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<AttendancePageResponse | null>(null)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)
  const [selected, setSelected] = useState<AttendanceRecord | null>(null)

  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    listAttendanceRecords({ from, to, status, checkType, page })
      .then(result => {
        if (active) setData(result)
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : 'Không thể tải danh sách điểm danh.')
        }
      })
    return () => {
      active = false
    }
  }, [from, to, status, checkType, page, revision])

  return (
    <main className="workspace accounts-page attendance-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHẤM CÔNG</p>
          <h1>Kết quả điểm danh</h1>
          <p className="muted">
            Kiểm tra ảnh Timemark, vị trí trên ảnh, định vị điện thoại và kết quả từng lượt điểm danh của nhân viên.
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => refresh(value => value + 1)}>
            Tải lại
          </button>
        </div>
      </div>

      <section className="account-card">
        <div className="attendance-filters" role="search" aria-label="Bộ lọc lượt điểm danh">
          <div>
            <label htmlFor="attendance-from">Từ ngày</label>
            <input
              id="attendance-from"
              type="date"
              value={from}
              onChange={event => {
                setFrom(event.target.value)
                setPage(0)
              }}
            />
          </div>
          <div>
            <label htmlFor="attendance-to">Đến ngày</label>
            <input
              id="attendance-to"
              type="date"
              value={to}
              onChange={event => {
                setTo(event.target.value)
                setPage(0)
              }}
            />
          </div>
          <div>
            <label htmlFor="attendance-type">Loại lượt</label>
            <select
              id="attendance-type"
              value={checkType}
              onChange={event => {
                setCheckType(event.target.value as AttendanceType | '')
                setPage(0)
              }}
            >
              <option value="">Tất cả loại lượt</option>
              <option value="CHECK_IN">Vào ca</option>
              <option value="CHECK_OUT">Ra ca</option>
            </select>
          </div>
          <div>
            <label htmlFor="attendance-status">Kết quả</label>
            <select
              id="attendance-status"
              value={status}
              onChange={event => {
                setStatus(event.target.value as AttendanceStatus | '')
                setPage(0)
              }}
            >
              <option value="">Tất cả kết quả</option>
              <option value="ON_TIME">Đúng giờ</option>
              <option value="LATE">Đi trễ</option>
              <option value="EARLY_LEAVE">Về sớm</option>
              <option value="ABSENT">Vắng</option>
              <option value="REJECTED">Không hợp lệ</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="table-state">
            <p role="alert">{error}</p>
            <button type="button" onClick={() => refresh(value => value + 1)}>
              Thử lại
            </button>
          </div>
        ) : !data ? (
          <p className="table-state" role="status">
            Đang tải danh sách lượt điểm danh…
          </p>
        ) : data.items.length === 0 ? (
          <div className="table-state">
            <h2>Chưa có lượt điểm danh phù hợp</h2>
            <p>Các lượt điểm danh vào/ra ca của nhân viên sẽ hiển thị tại đây kèm ảnh và vị trí đối chiếu.</p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nhân viên & Ca</th>
                    <th>Ảnh điểm danh</th>
                    <th>Vị trí trên ảnh</th>
                    <th>Định vị điện thoại</th>
                    <th>Kết quả</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(record => {
                    const coords = formatCoordinates(record)
                    return (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.employeeName}</strong>
                          <small className="cell-detail">
                            {dateLabel(record.workDate)} · {record.shiftName}
                            <span className="attendance-type-tag">{attendanceTypeLabels[record.checkType]}</span>
                          </small>
                          <small className="cell-detail">Ghi nhận: {instantLabel(record.recordedAt)}</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="attendance-photo-button"
                            onClick={() => setSelected(record)}
                            aria-label={'Xem ảnh điểm danh của ' + record.employeeName}
                          >
                            <img
                              className="attendance-photo-thumb"
                              src={record.photoUrl}
                              alt={'Ảnh điểm danh ' + record.employeeName}
                            />
                            <span>Xem ảnh</span>
                          </button>
                        </td>
                        <td>
                          <strong>{record.photoLocation}</strong>
                          {record.photoCapturedAt && (
                            <small className="cell-detail">Trên ảnh: {instantLabel(record.photoCapturedAt)}</small>
                          )}
                        </td>
                        <td>
                          <strong>{record.deviceLocation}</strong>
                          {coords && <small className="cell-detail">Tọa độ: {coords}</small>}
                        </td>
                        <td>
                          <span className={'attendance-badge status-' + record.status}>
                            {attendanceStatusLabels[record.status]}
                          </span>
                          {record.verificationNote && (
                            <small className="cell-detail">{record.verificationNote}</small>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelected(record)}
                            aria-label={'Xem chi tiết lượt điểm danh của ' + record.employeeName}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>
                Trang trước
              </button>
              <span>
                Trang {page + 1} / {Math.max(1, data.totalPages)}
              </span>
              <button
                type="button"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage(value => value + 1)}
              >
                Trang sau
              </button>
            </div>
          </>
        )}
      </section>

      {selected && (
        <Modal title="Chi tiết lượt điểm danh" busy={false} onClose={() => setSelected(null)}>
          <div className="attendance-detail-grid">
            <img
              className="attendance-detail-image"
              src={selected.photoUrl}
              alt={'Ảnh Timemark của ' + selected.employeeName}
            />
            <dl className="attendance-detail-list">
              <div>
                <dt>Nhân viên</dt>
                <dd>{selected.employeeName}</dd>
              </div>
              <div>
                <dt>Ca làm việc</dt>
                <dd>
                  {selected.shiftName} ({dateLabel(selected.workDate)})
                </dd>
              </div>
              <div>
                <dt>Loại lượt</dt>
                <dd>{attendanceTypeLabels[selected.checkType]}</dd>
              </div>
              <div>
                <dt>Kết quả</dt>
                <dd>{attendanceStatusLabels[selected.status]}</dd>
              </div>
              <div>
                <dt>Vị trí trên ảnh</dt>
                <dd>{selected.photoLocation}</dd>
              </div>
              <div>
                <dt>Thời gian trên ảnh</dt>
                <dd>{selected.photoCapturedAt ? instantLabel(selected.photoCapturedAt) : '—'}</dd>
              </div>
              <div>
                <dt>Định vị điện thoại</dt>
                <dd>
                  {selected.deviceLocation}
                  {formatCoordinates(selected) ? ` (${formatCoordinates(selected)})` : ''}
                </dd>
              </div>
              <div>
                <dt>Ghi chú đối chiếu</dt>
                <dd>{selected.verificationNote ?? 'Hợp lệ'}</dd>
              </div>
            </dl>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setSelected(null)}>
              Đóng
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
