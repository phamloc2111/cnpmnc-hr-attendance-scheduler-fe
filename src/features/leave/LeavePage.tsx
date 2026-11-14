import { useState, useEffect } from 'react'
import { getLeaveQuota, getMyLeaves, submitLeave } from './api'
import type { LeaveQuota, LeaveRequest } from './types'
import './leave.css'

export function LeavePage() {
  const [quota, setQuota] = useState<LeaveQuota | null>(null)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [q, l] = await Promise.all([getLeaveQuota(), getMyLeaves()])
      setQuota(q)
      setLeaves(l)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin phép.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quota?.canSubmit) {
      setError('Bạn đã hết 2 lần phép của tháng. Không thể gửi thêm đơn.')
      return
    }
    if (!workDate || !reason.trim()) {
      setError('Vui lòng chọn ngày và nhập lý do xin nghỉ.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await submitLeave({ workDate, reason: reason.trim() })
      setSuccess('Gửi đơn xin nghỉ phép thành công. Đơn đang chờ quản lý duyệt.')
      setReason('')
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi đơn xin nghỉ phép.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="leave-page">
      <h2>Đơn xin nghỉ phép</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Theo quy định, mỗi nhân viên được tối đa 2 lần xin nghỉ phép trong một tháng. Đơn được duyệt sẽ không bị tính vắng mặt hay trừ điểm chuyên cần.
      </p>

      {quota && (
        <div className={`leave-quota-card ${quota.remaining === 0 ? 'exhausted' : ''}`}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>
              Hạn mức phép tháng {quota.month}
            </h4>
            <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
              {quota.remaining === 0
                ? 'Bạn đã hết lượt nghỉ phép trong tháng này.'
                : `Bạn còn ${quota.remaining} lượt xin nghỉ phép trong tháng.`}
            </span>
          </div>
          <div className="leave-quota-stats">
            <div className="quota-item">
              <span className="quota-label">Đã duyệt</span>
              <span className="quota-value">{quota.approved}</span>
            </div>
            <div className="quota-item">
              <span className="quota-label">Đang chờ</span>
              <span className="quota-value">{quota.pending}</span>
            </div>
            <div className="quota-item">
              <span className="quota-label">Còn lại</span>
              <span className={`quota-value ${quota.remaining === 0 ? 'warning' : ''}`}>
                {quota.remaining} / {quota.maxAllowed}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{success}</div>}

      <div className="leave-form-card">
        <h3>Tạo đơn xin nghỉ mới</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="leaveDate">Ngày nghỉ (*)</label>
            <input
              id="leaveDate"
              type="date"
              value={workDate}
              onChange={e => setWorkDate(e.target.value)}
              disabled={!quota?.canSubmit || submitting}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="leaveReason">Lý do xin nghỉ (*)</label>
            <textarea
              id="leaveReason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do xin nghỉ phép cụ thể..."
              disabled={!quota?.canSubmit || submitting}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={!quota?.canSubmit || submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}
          </button>
          {!quota?.canSubmit && (
            <span style={{ marginLeft: '1rem', color: '#dc2626', fontSize: '0.9rem' }}>
              Đã dùng hết 2 lượt phép của tháng
            </span>
          )}
        </form>
      </div>

      <div className="leave-history-card">
        <h3>Lịch sử đơn xin nghỉ</h3>
        {loading ? (
          <p>Đang tải danh sách đơn...</p>
        ) : leaves.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Chưa có đơn xin nghỉ phép nào.</p>
        ) : (
          <table className="leave-table">
            <thead>
              <tr>
                <th>Ngày nghỉ</th>
                <th>Ca làm</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Người duyệt / Ghi chú</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(req => (
                <tr key={req.id}>
                  <td><strong>{req.workDate}</strong></td>
                  <td>{req.shiftName}</td>
                  <td>{req.reason}</td>
                  <td>
                    <span className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status === 'PENDING' && 'Đang chờ duyệt'}
                      {req.status === 'APPROVED' && 'Đã duyệt'}
                      {req.status === 'REJECTED' && 'Từ chối'}
                      {req.status === 'CANCELLED' && 'Đã hủy'}
                    </span>
                  </td>
                  <td>
                    {req.reviewerName ? (
                      <div>
                        <strong>{req.reviewerName}</strong>
                        {req.reviewerNote && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{req.reviewerNote}</div>}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
