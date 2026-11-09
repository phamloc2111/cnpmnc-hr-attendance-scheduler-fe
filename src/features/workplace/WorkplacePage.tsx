import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { HomeIcon } from '../../shared/components/HomeIcon'
import { instantLabel } from '../../shared/utils/dates'
import { getWorkplace, saveWorkplace } from './api'
import type { WorkplaceSettings } from './api'
import './workplace.css'

export function WorkplacePage() {
  const [settings, setSettings] = useState<WorkplaceSettings | null>(null)
  const [latitude, setLatitude] = useState(''), [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('100'), [tolerance, setTolerance] = useState('30')
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [locating, setLocating] = useState(false)
  const [error, setError] = useState(''), [loadError, setLoadError] = useState(''), [notice, setNotice] = useState('')
  const [gpsInfo, setGpsInfo] = useState(''), [revision, reload] = useState(0)
  const active = useRef(false), submitting = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  function fill(value: WorkplaceSettings) {
    setSettings(value); setLatitude(value.latitude === null ? '' : String(value.latitude)); setLongitude(value.longitude === null ? '' : String(value.longitude))
    setRadius(String(value.radiusMeters)); setTolerance(String(value.gpsToleranceMeters)); setGpsInfo('')
  }
  useEffect(() => {
    let current = true; setLoading(true); setLoadError(''); setError(''); setNotice('')
    getWorkplace().then(value => { if (current) fill(value) })
      .catch((failure: unknown) => { if (current) setLoadError(failure instanceof Error ? failure.message : 'Không tải được cấu hình điểm làm việc.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [revision])
  function locate() {
    if (locating || saving) return
    setError(''); setNotice('')
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ định vị. Hãy dùng HTTPS hoặc localhost, hoặc nhập tọa độ thủ công.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      if (!active.current) return
      setLocating(false)
      if (!Number.isFinite(position.coords.latitude) || !Number.isFinite(position.coords.longitude)) { setError('Không nhận được tọa độ hợp lệ. Hãy thử lại.'); return }
      setLatitude(position.coords.latitude.toFixed(7)); setLongitude(position.coords.longitude.toFixed(7))
      setGpsInfo(`Sai số vị trí vừa lấy: ±${Math.round(position.coords.accuracy)}m. Kiểm tra đúng điểm làm việc trước khi lưu.`)
    }, failure => {
      if (!active.current) return
      setLocating(false); setError(failure.code === 1 ? 'Bạn chưa cho phép định vị. Hãy cấp quyền hoặc nhập tọa độ thủ công.' : 'Không lấy được vị trí. Hãy bật GPS và thử lại hoặc nhập tọa độ thủ công.')
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (submitting.current || !settings || loading || locating) return
    const lat = Number(latitude), lon = Number(longitude), meters = Number(radius), gps = Number(tolerance)
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      !Number.isInteger(meters) || meters < 10 || meters > 5000 || !Number.isInteger(gps) || gps < 20 || gps > 50) {
      setError('Cần tọa độ hợp lệ, bán kính 10–5000m và dung sai GPS 20–50m.'); return
    }
    submitting.current = true; setSaving(true); setError(''); setNotice('')
    try {
      const value = await saveWorkplace({ latitude: lat, longitude: lon, radiusMeters: meters, gpsToleranceMeters: gps, version: settings.version })
      if (active.current) { fill(value); setNotice('Đã lưu cấu hình. Các lượt điểm danh tiếp theo áp dụng ngay điểm làm việc này.') }
    } catch (failure: unknown) { if (active.current) setError(failure instanceof Error ? failure.message : 'Không lưu được cấu hình.') }
    finally { submitting.current = false; if (active.current) setSaving(false) }
  }
  const dirty = settings && ((latitude.trim() ? Number(latitude) : null) !== settings.latitude ||
    (longitude.trim() ? Number(longitude) : null) !== settings.longitude || Number(radius) !== settings.radiusMeters || Number(tolerance) !== settings.gpsToleranceMeters)
  const limit = Number(radius) + Number(tolerance)
  const previewValid = !!radius && !!tolerance && Number.isFinite(limit) && Number(radius) >= 10 && Number(radius) <= 5000 && Number(tolerance) >= 20 && Number(tolerance) <= 50
  const coordinatesValid = latitude.trim() && longitude.trim() && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180
  return <main className="workspace workplace-page"><div className="page-heading"><div><p className="eyebrow">CẤU HÌNH CHẤM CÔNG</p><h1>Điểm làm việc</h1><p className="muted">Thiết lập tọa độ, bán kính và dung sai GPS dùng chung cho toàn hệ thống.</p></div><button disabled={saving || locating || loading} onClick={() => reload(value => value + 1)}>Tải lại</button></div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <p className="table-state" role="status">Đang tải cấu hình điểm làm việc…</p> : loadError ? <section className="account-card table-state"><p role="alert">{loadError}</p><button onClick={() => reload(value => value + 1)}>Thử lại</button></section>
      : settings && <>
        {!settings.configured && <div className="workplace-unconfigured"><HomeIcon name="pin" /><div><strong>Chưa thiết lập điểm làm việc</strong><p>Lưu tọa độ và bán kính để nhân viên có thể điểm danh.</p></div></div>}
        <div className="workplace-layout"><section className="account-card workplace-form-card"><div className="workplace-card-heading"><span className="workplace-icon"><HomeIcon name="pin" /></span><div><h2>Vị trí điểm danh</h2><p>Đặt tâm tại nơi nhân viên làm việc.</p></div></div>
          <form noValidate onSubmit={event => { void save(event) }}><fieldset disabled={saving || locating}>
            <button type="button" className="workplace-locate" onClick={locate}><HomeIcon name="pin" size={17} />{locating ? 'Đang lấy vị trí…' : 'Lấy vị trí hiện tại'}</button>
            <p className="workplace-hint">Chỉ dùng vị trí hiện tại khi bạn đang ở điểm làm việc. Có thể nhập tọa độ thủ công.</p>
            {gpsInfo && <p className="workplace-gps-info" role="status">{gpsInfo}</p>}
            <div className="form-grid"><div><label htmlFor="workplace-latitude">Vĩ độ</label><input id="workplace-latitude" type="number" step="any" min="-90" max="90" required placeholder="Ví dụ: 10.7726" value={latitude} onChange={event => setLatitude(event.target.value)} /></div>
              <div><label htmlFor="workplace-longitude">Kinh độ</label><input id="workplace-longitude" type="number" step="any" min="-180" max="180" required placeholder="Ví dụ: 106.6579" value={longitude} onChange={event => setLongitude(event.target.value)} /></div>
              <div><label htmlFor="workplace-radius">Bán kính điểm làm việc (m)</label><input id="workplace-radius" type="number" step="1" min="10" max="5000" required value={radius} onChange={event => setRadius(event.target.value)} /><small className="muted">Từ 10 đến 5000m, tính từ tọa độ tâm.</small></div>
              <div><label htmlFor="workplace-tolerance">Dung sai GPS (m)</label><input id="workplace-tolerance" type="number" step="1" min="20" max="50" required value={tolerance} onChange={event => setTolerance(event.target.value)} /><small className="muted">Từ 20 đến 50m, mặc định 30m.</small></div>
            </div>
            {coordinatesValid && <a className="workplace-map-link" href={'https://www.google.com/maps?q=' + encodeURIComponent(latitude + ',' + longitude)} target="_blank" rel="noopener noreferrer">Xem tọa độ trên bản đồ ↗</a>}
            {error && <p role="alert" className="error">{error}</p>}
            <div className="workplace-save"><small>{settings.updatedAt ? 'Lưu gần nhất: ' + instantLabel(settings.updatedAt) : settings.configured ? 'Đang dùng cấu hình máy chủ; lưu để quản lý trực tiếp trên web.' : 'Chưa có cấu hình được lưu.'}</small><button type="submit" className="primary" disabled={saving || locating}>{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button></div>
          </fieldset></form>
        </section>
        <aside className="account-card workplace-preview" aria-label="Quy tắc điểm danh"><span className={'workplace-configured ' + (settings.configured && !dirty ? 'ready' : '')}>{settings.configured ? dirty ? 'Thay đổi chưa lưu' : 'Đang có cấu hình áp dụng' : 'Chờ thiết lập'}</span>
          <div className="workplace-radius-visual" aria-hidden="true"><div><HomeIcon name="pin" size={29} /></div></div>
          <h2>Xem trước vùng điểm danh</h2><strong className="workplace-limit">{previewValid ? limit : '—'}<small>m</small></strong>
          <p>{previewValid ? `${radius}m bán kính + ${tolerance}m dung sai GPS` : 'Nhập bán kính và dung sai hợp lệ để xem vùng điểm danh.'}</p>
          <ul><li>GPS của điện thoại phải có sai số ±{tolerance || '—'}m hoặc tốt hơn.</li><li>Vị trí điện thoại và vị trí trên ảnh phải nằm trong vùng cho phép.</li><li>Sau khi bấm Lưu cấu hình, quy tắc mới áp dụng ngay cho lượt vào và lượt ra tiếp theo.</li></ul>
          <p className="workplace-shared-note">Quản lý và quản trị có thể chỉnh sửa. Điểm làm việc này dùng chung cho mọi nhân viên.</p>
        </aside></div>
      </>}
  </main>
}
