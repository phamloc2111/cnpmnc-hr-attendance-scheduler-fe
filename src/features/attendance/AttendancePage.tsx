import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AttendancePhoto } from './AttendancePhoto'
import { Modal } from '../../shared/components/Modal'
import { dateLabel, instantLabel } from '../../shared/utils/dates'
import { listAccounts } from '../accounts'
import type { Account } from '../accounts/types'
import {
  listAttendanceRecords,
  listRegisteredDevices,
  registerEmployeeDevice,
  resetEmployeeDevice,
} from './api'
import {
  attendanceStatusLabels,
  attendanceTypeLabels,
  fraudTypeLabels,
  type AttendancePageResponse,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceType,
  type RegisteredDevice,
} from './types'
import './attendance.css'
import './capture.css'

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
  const [notice, setNotice] = useState('')
  const [revision, refresh] = useState(0)
  const [selected, setSelected] = useState<AttendanceRecord | null>(null)
  const [devicesOpen, setDevicesOpen] = useState(false)

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

  const hasFraudAlert = Boolean(
    data?.items.some(item => item.mockLocation || item.fraudType || item.status === 'REJECTED'),
  )

  return (
    <main className="workspace accounts-page attendance-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHẤM CÔNG & CHỐNG GIAN LẬN</p>
          <h1>Kết quả điểm danh</h1>
          <p className="muted">
            Kiểm tra ảnh Timemark, vị trí trên ảnh, định vị điện thoại và kết quả từng lượt điểm danh · Chặn ảnh cũ, ảnh dùng lại, định vị giả · Chỉ lấy vị trí tại thời điểm chấm công, không theo dõi liên tục.
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => setDevicesOpen(true)}>
            Thiết bị đăng ký
          </button>
          <button type="button" onClick={() => refresh(value => value + 1)}>
            Tải lại
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}

      {hasFraudAlert && (
        <div className="attendance-fraud-banner" role="alert">
          <strong>Cảnh báo gian lận:</strong> Phát hiện lượt điểm danh bị từ chối (định vị giả, ảnh cũ, ảnh dùng lại hoặc thiết bị lạ). Vui lòng kiểm tra chi tiết bên dưới.
        </div>
      )}

      <nav className="attendance-page-links" aria-label="Xem bảng công"><a href="#/attendance" aria-current="page">Lượt điểm danh và ảnh</a><a href="#/attendance-results">Phân loại ca làm</a></nav>
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
                            <AttendancePhoto
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
                          {(record.deviceName || record.deviceId) && (
                            <small className="cell-detail">
                              Thiết bị: {record.deviceName || record.deviceId}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className={'attendance-badge status-' + record.status}>
                            {attendanceStatusLabels[record.status]}
                          </span>
                          {record.fraudType && (
                            <div>
                              <span className="attendance-fraud-tag">
                                {fraudTypeLabels[record.fraudType]}
                              </span>
                            </div>
                          )}
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
            <AttendancePhoto
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
                <dt>Thiết bị điểm danh</dt>
                <dd>{selected.deviceName || selected.deviceId || 'Chưa ghi nhận'}</dd>
              </div>
              {selected.fraudType && (
                <div>
                  <dt>Phân loại chống gian lận</dt>
                  <dd>{fraudTypeLabels[selected.fraudType]}</dd>
                </div>
              )}
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

      {devicesOpen && (
        <DeviceManagementModal
          onClose={() => setDevicesOpen(false)}
          onSaved={message => {
            setNotice(message)
            refresh(value => value + 1)
          }}
        />
      )}
    </main>
  )
}

function DeviceManagementModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [devices, setDevices] = useState<RegisteredDevice[] | null>(null)
  const [employees, setEmployees] = useState<Account[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, refresh] = useState(0)

  useEffect(() => {
    let active = true
    setError('')
    Promise.all([
      listRegisteredDevices(),
      listAccounts({ page: 0, q: '', role: 'EMPLOYEE', locked: 'false' }),
    ])
      .then(([deviceList, accountPage]) => {
        if (!active) return
        setDevices(deviceList)
        setEmployees(accountPage.items)
        if (!employeeId && accountPage.items.length > 0) {
          setEmployeeId(accountPage.items[0].id)
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : 'Không tải được danh sách thiết bị.')
        }
      })
    return () => {
      active = false
    }
  }, [revision])

  async function saveDevice(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!employeeId || !deviceId.trim()) {
      setError('Vui lòng chọn nhân viên và nhập mã thiết bị mới.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await registerEmployeeDevice(employeeId, deviceId, deviceName)
      setDeviceId('')
      setDeviceName('')
      refresh(value => value + 1)
      onSaved('Đã đăng ký lại thiết bị điểm danh cho nhân viên.')
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không thể đăng ký lại thiết bị.')
    } finally {
      setBusy(false)
    }
  }

  async function removeDevice(targetEmployeeId: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await resetEmployeeDevice(targetEmployeeId)
      refresh(value => value + 1)
      onSaved('Đã gỡ thiết bị cũ; nhân viên có thể đăng ký thiết bị mới ở lượt chấm công tiếp theo.')
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không thể gỡ thiết bị.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Thiết bị điểm danh đã đăng ký" busy={busy} onClose={onClose}>
      <p className="muted">
        Mỗi tài khoản nhân viên gắn với một thiết bị đã đăng ký. Khi nhân viên đổi máy, quản lý có thể đăng ký lại hoặc gỡ thiết bị cũ tại đây.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!devices ? (
        <p role="status">Đang tải danh sách thiết bị…</p>
      ) : devices.length === 0 ? (
        <p>Chưa có thiết bị nào được đăng ký.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Mã thiết bị</th>
                <th>Tên thiết bị</th>
                <th>Đăng ký lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(item => (
                <tr key={item.employeeId}>
                  <td>
                    <strong>{item.employeeName}</strong>
                  </td>
                  <td>
                    <code>{item.deviceId}</code>
                  </td>
                  <td>{item.deviceName ?? '—'}</td>
                  <td>{instantLabel(item.registeredAt)}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void removeDevice(item.employeeId)
                      }}
                      aria-label={'Gỡ thiết bị của ' + item.employeeName}
                    >
                      Đổi máy / Gỡ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="attendance-device-form"
        onSubmit={event => {
          void saveDevice(event)
        }}
      >
        <div>
          <label htmlFor="device-employee">Nhân viên</label>
          <select
            id="device-employee"
            value={employeeId}
            disabled={busy}
            onChange={event => setEmployeeId(event.target.value)}
          >
            <option value="">Chọn nhân viên</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="device-id-input">Mã thiết bị mới</label>
          <input
            id="device-id-input"
            value={deviceId}
            disabled={busy}
            onChange={event => setDeviceId(event.target.value)}
            placeholder="VD: device-iphone-15"
          />
        </div>
        <div>
          <label htmlFor="device-name-input">Tên thiết bị</label>
          <input
            id="device-name-input"
            value={deviceName}
            disabled={busy}
            onChange={event => setDeviceName(event.target.value)}
            placeholder="VD: iPhone 15 của An"
          />
        </div>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Đăng ký lại thiết bị'}
        </button>
      </form>

      <div className="modal-actions">
        <button type="button" disabled={busy} onClick={onClose}>
          Đóng
        </button>
      </div>
    </Modal>
  )
}
