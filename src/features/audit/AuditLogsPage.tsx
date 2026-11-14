import { useEffect, useMemo, useState } from 'react'
import { listAuditLogs } from './api'
import type { AuditLogItem } from './types'
import './audit.css'

export function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [personQuery, setPersonQuery] = useState('')

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listAuditLogs({
        category: category || undefined,
        from: from || undefined,
        to: to || undefined,
        size: 100
      })
      setItems(response.items)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải nhật ký thay đổi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [category, from, to])

  const filteredItems = useMemo(() => {
    const q = personQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      item =>
        item.actorName.toLowerCase().includes(q) ||
        (item.targetEmployeeName && item.targetEmployeeName.toLowerCase().includes(q)) ||
        item.actorId.toLowerCase().includes(q)
    )
  }, [items, personQuery])

  return (
    <div className="audit-page">
      <h2>Nhật ký thay đổi (Audit Log)</h2>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        Truy vết toàn bộ lịch sử chỉnh sửa lịch làm việc và giờ công/chuyên cần trong hệ thống.
      </p>

      <div className="audit-readonly-banner" role="note">
        <span>🔒 <strong>Chế độ chỉ đọc (Read-only):</strong> Nhật ký hệ thống được bảo toàn nguyên vẹn và không thể chỉnh sửa hoặc xóa.</span>
        <span>Tổng số bản ghi: <strong>{filteredItems.length}</strong></span>
      </div>

      <div className="audit-filters">
        <div className="audit-filter-field">
          <label htmlFor="auditPersonFilter">Lọc theo người (Người sửa / Nhân viên)</label>
          <input
            id="auditPersonFilter"
            type="text"
            placeholder="Nhập tên người sửa hoặc nhân viên..."
            value={personQuery}
            onChange={e => setPersonQuery(e.target.value)}
          />
        </div>
        <div className="audit-filter-field">
          <label htmlFor="auditCategoryFilter">Loại thay đổi</label>
          <select
            id="auditCategoryFilter"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Tất cả loại</option>
            <option value="SCHEDULE">Lịch làm việc (SCHEDULE)</option>
            <option value="ATTENDANCE">Giờ công / Chuyên cần (ATTENDANCE)</option>
          </select>
        </div>
        <div className="audit-filter-field">
          <label htmlFor="auditFromDate">Từ ngày</label>
          <input
            id="auditFromDate"
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </div>
        <div className="audit-filter-field">
          <label htmlFor="auditToDate">Đến ngày</label>
          <input
            id="auditToDate"
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="audit-table-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải nhật ký thay đổi...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Không có bản ghi nhật ký nào phù hợp với bộ lọc.
          </div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Thời điểm sửa</th>
                <th>Người sửa</th>
                <th>Nhân viên / Ngày ca</th>
                <th>Phân loại</th>
                <th>Giá trị cũ</th>
                <th>Giá trị mới</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem', color: '#475569' }}>
                    {new Date(item.occurredAt).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <strong>{item.actorName}</strong>
                  </td>
                  <td>
                    <div>{item.targetEmployeeName || '—'}</div>
                    <small style={{ color: '#64748b' }}>Ngày: {item.targetDate}</small>
                  </td>
                  <td>
                    <span className={`audit-badge ${item.category.toLowerCase()}`}>
                      {item.category === 'SCHEDULE' ? 'Lịch làm việc' : 'Giờ công'}
                    </span>
                    <div style={{ fontSize: '0.82rem', marginTop: '0.3rem', color: '#334155' }}>
                      {item.summary}
                    </div>
                  </td>
                  <td>
                    <div className="audit-diff-box old">
                      {item.oldValue || 'Không có (Tạo mới)'}
                    </div>
                  </td>
                  <td>
                    <div className="audit-diff-box new">
                      {item.newValue || 'Đã xóa / Hủy'}
                    </div>
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
