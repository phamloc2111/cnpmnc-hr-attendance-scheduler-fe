import { useState, useEffect } from 'react'
import { listLeaveRequests, reviewLeave } from './api'
import type { LeaveRequest } from './types'
import './leave.css'

export function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [activeDialog, setActiveDialog] = useState<{ id: string; action: 'APPROVE' | 'REJECT'; name: string } | null>(null)
  const [note, setNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listLeaveRequests({
        status: statusFilter || undefined,
        size: 50
      })
      setRequests(res.items)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn nghỉ phép.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [statusFilter])

  const handleReview = async () => {
    if (!activeDialog) return
    setProcessing(true)
    setError(null)
    setActionSuccess(null)
    try {
      await reviewLeave(activeDialog.id, {
        action: activeDialog.action,
        note: note.trim() || undefined
      })
      setActionSuccess(
        activeDialog.action === 'APPROVE'
          ? 'Đã duyệt đơn nghỉ phép thành công. Ca đã được đánh dấu thiếu người.'
          : 'Đã từ chối đơn nghỉ phép.'
      )
      setActiveDialog(null)
      setNote('')
      await loadRequests()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xử lý đơn nghỉ phép.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="leave-page">
      <h2>Duyệt đơn xin nghỉ phép</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Quản lý và duyệt đơn nghỉ phép của nhân viên. Khi duyệt, ca làm việc sẽ chuyển sang trạng thái <strong>thiếu người</strong> để cảnh báo quản lý chủ động tìm người thay thế.
      </p>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>}
      {actionSuccess && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{actionSuccess}</div>}

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Lọc trạng thái:</label>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #d1d5db' }}
        >
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
        <button
          onClick={() => void loadRequests()}
          style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
        >
          Làm mới
        </button>
      </div>

      <div className="leave-form-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải danh sách...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Không có đơn xin nghỉ phép nào.</div>
        ) : (
          <table className="leave-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Ngày nghỉ</th>
                <th>Ca làm</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Người duyệt / Ghi chú</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td><strong>{req.employeeName}</strong></td>
                  <td>{req.workDate}</td>
                  <td>{req.shiftName}</td>
                  <td style={{ maxWidth: 220 }}>{req.reason}</td>
                  <td>
                    <span className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status === 'PENDING' && 'Chờ duyệt'}
                      {req.status === 'APPROVED' && 'Đã duyệt'}
                      {req.status === 'REJECTED' && 'Từ chối'}
                    </span>
                    {req.status === 'APPROVED' && (
                      <div className="understaffed-warning">
                        ⚠️ Thiếu người
                      </div>
                    )}
                  </td>
                  <td>
                    {req.reviewerName ? (
                      <div>
                        <span style={{ fontWeight: 600 }}>{req.reviewerName}</span>
                        {req.reviewerNote && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{req.reviewerNote}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    {req.status === 'PENDING' ? (
                      <div style={{ display: 'flex' }}>
                        <button
                          className="btn-success"
                          onClick={() => {
                            setActiveDialog({ id: req.id, action: 'APPROVE', name: req.employeeName })
                            setNote('')
                          }}
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => {
                            setActiveDialog({ id: req.id, action: 'REJECT', name: req.employeeName })
                            setNote('')
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Đã xong</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activeDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: 440, maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>
              {activeDialog.action === 'APPROVE' ? 'Xác nhận duyệt đơn nghỉ' : 'Xác nhận từ chối đơn nghỉ'}
            </h3>
            <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>
              Nhân viên: <strong>{activeDialog.name}</strong>
            </p>
            {activeDialog.action === 'APPROVE' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.6rem 0.8rem', borderRadius: 6, fontSize: '0.85rem', color: '#92400e', marginBottom: '1rem' }}>
                Khi duyệt đơn, hệ thống sẽ tự động cảnh báo ca bị thiếu người để bạn bố trí người làm thay.
              </div>
            )}
            <div className="form-group">
              <label>Ghi chú phản hồi cho nhân viên (tùy chọn):</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Nhập lý do hoặc lời nhắn..."
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                disabled={processing}
              >
                Hủy
              </button>
              <button
                type="button"
                className={activeDialog.action === 'APPROVE' ? 'btn-success' : 'btn-danger'}
                onClick={() => void handleReview()}
                disabled={processing}
                style={{ padding: '0.5rem 1.25rem' }}
              >
                {processing ? 'Đang xử lý...' : activeDialog.action === 'APPROVE' ? 'Duyệt đơn' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
