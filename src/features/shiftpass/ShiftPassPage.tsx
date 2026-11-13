import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { addDays, dateLabel, instantLabel, vietnamToday } from '../../shared/utils/dates'
import { listSchedules } from '../schedule/api'
import type { WorkSchedule } from '../schedule/types'
import {
  cancelShiftPass,
  claimShiftPass,
  createShiftPass,
  listAvailableShiftPasses,
  listMyShiftPasses,
  listShiftPassNotifications,
} from './api'
import type {
  AvailableShiftPassItem,
  ShiftPassItem,
  ShiftPassNotificationItem,
  ShiftPassStatus,
} from './types'
import './shiftpass.css'

const statusLabels: Record<ShiftPassStatus, string> = {
  OPEN: 'Đang chờ nhận (Ca vẫn thuộc về bạn)',
  CLAIMED: 'Đã có người nhận',
  CANCELLED: 'Đã hủy yêu cầu',
  EXPIRED: 'Hết hạn (Ca giữ nguyên cho bạn)',
}

const formatHours = (minutes: number) => `${(minutes / 60).toFixed(1).replace(/\.0$/, '')}h`

export function ShiftPassPage({ managerOnly = false }: { managerOnly?: boolean }) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [myPasses, setMyPasses] = useState<ShiftPassItem[]>([])
  const [availablePasses, setAvailablePasses] = useState<AvailableShiftPassItem[]>([])
  const [notifications, setNotifications] = useState<ShiftPassNotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyPassId, setBusyPassId] = useState('')

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true)
        setError('')
      }
      try {
        if (managerOnly) {
          const notifs = await listShiftPassNotifications()
          setNotifications(notifs)
          return
        }
        const today = vietnamToday()
        const toDate = addDays(today, 14)
        async function fetchAllUpcomingSchedules() {
          const first = await listSchedules(today, toDate, 0)
          const items = [...first.items]
          for (let page = 1; page < first.totalPages; page += 1) {
            const next = await listSchedules(today, toDate, page)
            items.push(...next.items)
          }
          return items
        }
        const [scheduleItems, passes, available, notifs] = await Promise.all([
          fetchAllUpcomingSchedules(),
          listMyShiftPasses(),
          listAvailableShiftPasses(),
          listShiftPassNotifications(),
        ])
        setSchedules(scheduleItems)
        setMyPasses(passes)
        setAvailablePasses(available)
        setNotifications(notifs)
      } catch (err: unknown) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu pass ca.')
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [managerOnly],
  )

  useEffect(() => {
    void loadAll(false)
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        void loadAll(true)
      }
    }, 3500)
    const onUpdated = () => {
      void loadAll(true)
    }
    window.addEventListener('shiftsync:schedule-updated', onUpdated)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('shiftsync:schedule-updated', onUpdated)
    }
  }, [loadAll])

  const openScheduleIds = useMemo(
    () => new Set(myPasses.filter(p => p.status === 'OPEN').map(p => p.scheduleId)),
    [myPasses],
  )

  const upcomingEligibleToPost = useMemo(() => {
    const now = Date.now()
    return schedules.filter(s => Date.parse(s.startsAt) > now && !openScheduleIds.has(s.id))
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
      await loadAll(false)
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
      await loadAll(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể hủy yêu cầu pass ca.')
    } finally {
      setBusyPassId('')
    }
  }

  async function handleClaim(item: AvailableShiftPassItem) {
    setBusyPassId(item.id)
    setError('')
    setNotice('')
    try {
      const claimed = await claimShiftPass(item.id)
      window.dispatchEvent(new CustomEvent('shiftsync:schedule-updated'))
      setNotice(
        `Đã nhận ca "${claimed.shiftName}" ngày ${dateLabel(claimed.workDate)} thành công. Thời khóa biểu của bạn và ${claimed.requesterName} đã được cập nhật và đã báo quản lý.`,
      )
      await loadAll(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể nhận ca pass này.')
      await loadAll(true)
    } finally {
      setBusyPassId('')
    }
  }

  const activeNotifications = notifications.filter(n => n.status === 'OPEN')

  return (
    <main className="workspace shiftpass-page">
      <div className="shiftpass-header">
        <p className="eyebrow">CHUYỂN GIAO CA LÀM · SHIFTPASS</p>
        <h1>{managerOnly ? 'Thông báo biến động pass ca' : 'Pass ca & Nhận ca làm thêm'}</h1>
        <p>
          {managerOnly
            ? 'Theo dõi các ca đã được nhân viên pass và nhận thay đổi trong đội ngũ.'
            : 'Đăng pass ca khi không thể đi làm hoặc nhận ca phù hợp (không trùng giờ, tối đa 48h/tuần).'}
        </p>
      </div>

      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {!managerOnly && (
        <section className="shiftpass-card" aria-label="Ca đồng nghiệp đang pass">
          <div className="shiftpass-item-head">
            <h2>Ca đang mở cần người nhận ({availablePasses.length})</h2>
            <button type="button" onClick={() => void loadAll(false)} disabled={loading}>
              Tải lại
            </button>
          </div>
          {loading && !availablePasses.length ? (
            <p role="status">Đang tải danh sách ca có thể nhận…</p>
          ) : availablePasses.length === 0 ? (
            <p className="muted">Hiện chưa có ca pass nào cùng vị trí cần người nhận.</p>
          ) : (
            <ul className="shiftpass-list">
              {availablePasses.map(item => (
                <li key={item.id} className="shiftpass-item">
                  <div className="shiftpass-item-head">
                    <strong>
                      {item.shiftName} · {dateLabel(item.workDate)} (từ {item.requesterName})
                    </strong>
                    {item.eligible && <span className="shiftpass-eligible-badge">Đủ điều kiện nhận</span>}
                  </div>
                  <div className="shiftpass-meta">
                    <span>Giờ làm: {instantLabel(item.startsAt)} – {instantLabel(item.endsAt)}</span>
                    <span>Thời lượng: {formatHours(item.workingMinutes)}</span>
                    {item.requiredPosition && <span>Vị trí: {item.requiredPosition}</span>}
                    <span>
                      Tổng tuần này: {formatHours(item.currentWeekMinutes)} →{' '}
                      {formatHours(item.currentWeekMinutes + item.workingMinutes)} / {formatHours(item.maxWeeklyMinutes)}
                    </span>
                  </div>
                  {item.reason && <p style={{ margin: 0 }}>Lý do pass: {item.reason}</p>}
                  <div className="shiftpass-actions">
                    {item.eligible ? (
                      <button
                        type="button"
                        className="primary"
                        disabled={busyPassId === item.id}
                        onClick={() => void handleClaim(item)}
                      >
                        {busyPassId === item.id ? 'Đang nhận ca…' : 'Nhận ca'}
                      </button>
                    ) : (
                      <span className="shiftpass-ineligible" role="note">
                        {item.ineligibleReason || 'Không đủ điều kiện nhận ca'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="shiftpass-grid">
        {!managerOnly && (
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
        )}

        <section
          className="shiftpass-card"
          aria-label={managerOnly ? 'Thông báo biến động pass ca' : 'Thông báo pass ca cùng vị trí'}
        >
          <h2>Thông báo pass ca ({activeNotifications.length})</h2>
          {activeNotifications.length === 0 ? (
            <p className="muted">Không còn thông báo pass ca nào đang mở.</p>
          ) : (
            <ul className="shiftpass-list">
              {activeNotifications.map(n => (
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

      {!managerOnly && (
        <section className="shiftpass-card" aria-label="Yêu cầu pass ca của tôi">
          <div className="shiftpass-item-head">
            <h2>Lịch sử pass / nhận ca của tôi</h2>
            <button type="button" onClick={() => void loadAll(false)} disabled={loading}>
              Tải lại
            </button>
          </div>
          {myPasses.length === 0 ? (
            <p className="muted">Bạn chưa có yêu cầu pass ca hoặc nhận ca nào.</p>
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
      )}
    </main>
  )
}
