import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { addDays, dateLabel, instantLabel, vietnamToday } from '../../shared/utils/dates'
import { listSchedules } from '../schedule/api'
import type { WorkSchedule } from '../schedule/types'
import { cancelShiftPass, createShiftPass, listMyShiftPasses, listShiftPassNotifications } from './api'
import type { ShiftPassItem, ShiftPassNotificationItem, ShiftPassStatus } from './types'
import './shiftpass.css'

const statusLabels: Record<ShiftPassStatus, string> = {
  OPEN: 'Đang chờ nhận (Ca vẫn thuộc về bạn)',
  CLAIMED: 'Đã có người nhận',
  CANCELLED: 'Đã hủy yêu cầu',
  EXPIRED: 'Hết hạn (Ca giữ nguyên cho bạn)',
}

export function ShiftPassPage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [myPasses, setMyPasses] = useState<ShiftPassItem[]>([])
  const [notifications, setNotifications] = useState<ShiftPassNotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyPassId, setBusyPassId] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const today = vietnamToday()
      const [schedulePage, passes, notifs] = await Promise.all([
        listSchedules(today, addDays(today, 14), 0),
        listMyShiftPasses(),
        listShiftPassNotifications(),
      ])
      setSchedules(schedulePage.items)
      setMyPasses(passes)
      setNotifications(notifs)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu pass ca.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const openScheduleIds = useMemo(
    () => new Set(myPasses.filter(p => p.status === 'OPEN').map(p => p.scheduleId)),
    [myPasses],
  )

  const upcomingEligibleToPost = useMemo(() => {
    const now = Date.now()
    return schedules.filter(
      s => Date.parse(s.startsAt) > now && !openScheduleIds.has(s.id),
    )
  }, [schedules, openScheduleIds])

  useEffect(() => {
    if (!upcomingEligibleToPost.some(s => s.id === selectedScheduleId)) {
      setSelectedScheduleId(upcomingEligibleToPost[0]?.id ?? '')
    }
  }, [upcomingEligibleToPost, selectedScheduleId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selectedScheduleId) return
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const created = await createShiftPass(selectedScheduleId, reason)
      setReason('')
      setNotice(
        `Đã đăng pass ca "${created.shiftName}" và gửi thông báo đẩy đến ${created.notifiedCount} nhân viên cùng vị trí. Nếu không có ai nhận, ca vẫn thuộc về bạn.`,
      )
      await loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể đăng pass ca.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(passId: string) {
    setBusyPassId(passId)
    setError('')
    setNotice('')
    try {
      await cancelShiftPass(passId)
      setNotice('Đã hủy yêu cầu pass ca. Ca làm vẫn được giữ cho bạn.')
      await loadAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể hủy yêu cầu pass ca.')
    } finally {
      setBusyPassId('')
    }
  }

  const openNotifications = notifications.filter(n => n.status === 'OPEN')

  return (
    <main className="workspace shiftpass-page">
      <div className="shiftpass-header">
        <p className="eyebrow">CHUYỂN GIAO CA LÀM · SHIFTPASS</p>
        <h1>Đăng pass ca</h1>
        <p>Chọn ca sắp tới để nhường cho nhân viên cùng vị trí. Nếu không ai nhận, ca vẫn thuộc về bạn.</p>
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="shiftpass-grid">
        <section className="shiftpass-card" aria-label="Tạo yêu cầu pass ca">
          <h2>Đăng thông báo pass ca</h2>
          <p className="shiftpass-note">
            Khi đăng pass ca, hệ thống sẽ gửi thông báo đẩy tới toàn bộ nhân viên cùng vị trí công việc.
          </p>
          {loading && !schedules.length ? (
            <p role="status">Đang tải danh sách ca làm…</p>
          ) : upcomingEligibleToPost.length === 0 ? (
            <p className="muted">Hiện bạn không có ca sắp tới nào khả dụng để đăng pass ca.</p>
          ) : (
            <form className="shiftpass-form" onSubmit={handleSubmit}>
              <div className="shiftpass-field">
                <label htmlFor="shiftpass-schedule">Chọn ca làm cần pass</label>
                <select
                  id="shiftpass-schedule"
                  value={selectedScheduleId}
                  onChange={e => setSelectedScheduleId(e.target.value)}
                  disabled={submitting}
                >
                  {upcomingEligibleToPost.map(item => (
                    <option key={item.id} value={item.id}>
                      {dateLabel(item.workDate)} · {item.shiftName} ({instantLabel(item.startsAt).split(' ')[1]} – {instantLabel(item.endsAt).split(' ')[1]})
                      {item.requiredPosition ? ` · ${item.requiredPosition}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="shiftpass-field">
                <label htmlFor="shiftpass-reason">Lý do nhường ca (không bắt buộc)</label>
                <textarea
                  id="shiftpass-reason"
                  rows={3}
                  maxLength={500}
                  placeholder="Ví dụ: Có lịch thi hoặc việc gia đình đột xuất..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="shiftpass-actions">
                <button className="primary" type="submit" disabled={submitting || !selectedScheduleId}>
                  {submitting ? 'Đang gửi thông báo…' : 'Đăng pass ca'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="shiftpass-card" aria-label="Thông báo pass ca cùng vị trí">
          <h2>Thông báo pass ca ({openNotifications.length})</h2>
          {openNotifications.length === 0 ? (
            <p className="muted">Chưa có thông báo pass ca đang mở nào dành cho bạn.</p>
          ) : (
            <ul className="shiftpass-list">
              {openNotifications.map(n => (
                <li key={n.id} className="shiftpass-item">
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small className="muted">{instantLabel(n.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="shiftpass-card" aria-label="Yêu cầu pass ca của tôi">
        <div className="shiftpass-item-head">
          <h2>Yêu cầu pass ca của tôi</h2>
          <button type="button" onClick={() => void loadAll()} disabled={loading}>
            Tải lại
          </button>
        </div>
        {myPasses.length === 0 ? (
          <p className="muted">Bạn chưa có yêu cầu pass ca nào.</p>
        ) : (
          <ul className="shiftpass-list">
            {myPasses.map(item => (
              <li key={item.id} className="shiftpass-item">
                <div className="shiftpass-item-head">
                  <strong>
                    {item.shiftName} · {dateLabel(item.workDate)}
                  </strong>
                  <span className={`shiftpass-badge shiftpass-badge-${item.status}`}>
                    {statusLabels[item.status]}
                  </span>
                </div>
                <div className="shiftpass-meta">
                  <span>Giờ làm: {instantLabel(item.startsAt)} – {instantLabel(item.endsAt)}</span>
                  {item.requiredPosition && <span>Vị trí: {item.requiredPosition}</span>}
                  {item.claimerName && <span>Người nhận ca: {item.claimerName}</span>}
                </div>
                {item.reason && <p style={{ margin: 0 }}>Lý do: {item.reason}</p>}
                {item.status === 'OPEN' && (
                  <div className="shiftpass-actions">
                    <button
                      type="button"
                      disabled={busyPassId === item.id}
                      onClick={() => void handleCancel(item.id)}
                    >
                      {busyPassId === item.id ? 'Đang hủy…' : 'Hủy pass ca'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
