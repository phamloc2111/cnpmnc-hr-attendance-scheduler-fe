import { useEffect, useRef, useState } from 'react'
import type { Map as GoongMap, Marker } from '@goongmaps/goong-js'
import { loadGoongSdk } from './goongSdk'
import { workplaceAreas, workplaceBounds } from './workplaceGeometry'
import type { Coordinates } from './workplaceGeometry'

type Props = {
  position: Coordinates | null
  radius: number | null
  tolerance: number | null
  disabled: boolean
  onSelect: (position: Coordinates) => void
}

export function GoongWorkplaceMap(props: Props) {
  const rawKey: unknown = import.meta.env.VITE_GOONG_MAPTILES_KEY
  const key = typeof rawKey === 'string' ? rawKey.trim() : ''
  const [opened, setOpened] = useState(false), [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const container = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  latest.current = props
  const controller = useRef<{ update: (focus: boolean) => void } | null>(null)

  useEffect(() => {
    if (!opened || !key || !container.current) return
    let disposed = false, loaded = false
    let map: GoongMap | null = null, marker: Marker | null = null
    let observer: ResizeObserver | null = null
    setState('loading')
    const timeout = window.setTimeout(() => { if (!disposed && !loaded) setState('error') }, 20000)
    const host = container.current
    void loadGoongSdk().then(sdk => {
      if (disposed) return
      if (!sdk.supported()) throw new Error('WebGL unavailable')
      sdk.accessToken = key
      const initial = latest.current.position
      const instance = new sdk.Map({ container: host, style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: initial ? [initial.longitude, initial.latitude] : [106, 16], zoom: initial ? 15 : 5, attributionControl: true })
      map = instance
      instance.addControl(new sdk.NavigationControl({ showCompass: false }), 'top-right')
      function update(focus: boolean) {
        const { position, radius, tolerance, disabled } = latest.current
        if (position) {
          if (!marker) {
            marker = new sdk.Marker({ color: '#0758c9', draggable: !disabled }).setLngLat([position.longitude, position.latitude]).addTo(instance)
            marker.getElement().setAttribute('aria-label', 'Ghim điểm làm việc')
            marker.on('dragend', () => {
              if (!marker || latest.current.disabled) return
              const { lat, lng } = marker.getLngLat()
              latest.current.onSelect({ latitude: lat, longitude: ((lng + 540) % 360) - 180 })
            })
          }
          marker.setLngLat([position.longitude, position.latitude]).setDraggable(!disabled)
          if (focus) instance.fitBounds(workplaceBounds(position, (radius ?? 100) + (tolerance ?? 30)), { padding: 48, maxZoom: 17, duration: 0 })
        } else { marker?.remove(); marker = null }
        if (loaded) instance.getSource('workplace-area')?.setData(workplaceAreas(position, radius, tolerance))
      }
      controller.current = { update }
      instance.on('click', event => {
        if (latest.current.disabled || !event.lngLat) return
        const { lat, lng } = event.lngLat
        latest.current.onSelect({ latitude: lat, longitude: ((lng + 540) % 360) - 180 })
      })
      instance.on('error', () => { if (!disposed) setState('error') })
      instance.on('load', () => {
        if (disposed) return
        loaded = true; window.clearTimeout(timeout)
        instance.addSource('workplace-area', { type: 'geojson', data: workplaceAreas(null, null, null) })
        for (const zone of ['tolerance', 'workplace']) {
          const color = zone === 'workplace' ? '#0758c9' : '#c88a09'
          instance.addLayer({ id: zone + '-fill', type: 'fill', source: 'workplace-area', filter: ['==', 'zone', zone], paint: { 'fill-color': color, 'fill-opacity': 0.12 } })
          instance.addLayer({ id: zone + '-outline', type: 'line', source: 'workplace-area', filter: ['==', 'zone', zone],
            paint: { 'line-color': color, 'line-width': 2, ...(zone === 'tolerance' ? { 'line-dasharray': [3, 2] } : {}) } })
        }
        update(true); setState('ready')
      })
      update(false)
      if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(() => instance.resize()); observer.observe(host) }
    }).catch(() => { if (!disposed) setState('error') })
    return () => {
      disposed = true; window.clearTimeout(timeout); observer?.disconnect()
      controller.current = null; marker?.remove(); map?.remove()
    }
  }, [opened, attempt, key])

  useEffect(() => { controller.current?.update(true) }, [props.position?.latitude, props.position?.longitude, props.radius, props.tolerance])
  useEffect(() => { controller.current?.update(false) }, [props.disabled])

  return <section className="workplace-map-section" aria-label="Chọn điểm làm việc trên bản đồ">
    <div className="workplace-map-heading"><h3>Bản đồ điểm làm việc</h3><span>Goong Maps</span></div>
    {!key ? <p className="workplace-map-placeholder" role="status">Bản đồ chưa được cấu hình. Bạn vẫn có thể nhập tọa độ hoặc lấy vị trí hiện tại.</p>
      : !opened ? <div className="workplace-map-placeholder"><p>Chọn vị trí trực tiếp và xem vùng chấm công trên bản đồ.</p><button type="button" disabled={props.disabled} onClick={() => setOpened(true)}>Mở bản đồ Goong</button></div>
      : <>
        <p className="workplace-hint">Bấm vào bản đồ hoặc kéo ghim để chọn tâm. Thay đổi chỉ áp dụng sau khi bấm Lưu cấu hình.</p>
        <div className="workplace-map-canvas" ref={container} role="region" aria-label="Bản đồ Goong" />
        {state === 'loading' && <p className="workplace-hint" role="status">Đang tải bản đồ Goong…</p>}
        {state === 'error' && <div className="workplace-map-error"><p role="alert">Không tải được bản đồ Goong. Kiểm tra kết nối hoặc quyền truy cập bản đồ. Bạn vẫn có thể nhập tọa độ thủ công.</p><button type="button" disabled={props.disabled} onClick={() => setAttempt(value => value + 1)}>Thử lại bản đồ</button></div>}
        <div className="workplace-map-legend"><span><i />Bán kính điểm làm việc</span><span><i />Vùng gồm dung sai GPS</span></div>
        <button type="button" className="workplace-map-center" disabled={props.disabled || !props.position || state !== 'ready'} onClick={() => controller.current?.update(true)}>Về vị trí đã chọn</button>
        {!props.position && <p className="workplace-hint">Chưa chọn vị trí. Bấm vào đúng nơi nhân viên làm việc để đặt ghim.</p>}
      </>}
  </section>
}
