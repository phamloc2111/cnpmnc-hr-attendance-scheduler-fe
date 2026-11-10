import { useEffect, useRef, useState } from 'react'
import { getWorkplacePlace, searchWorkplacePlaces } from './api'
import type { WorkplacePlace, WorkplacePlaceSuggestion } from './api'
import type { Coordinates } from './workplaceGeometry'

type Props = { disabled: boolean; position: Coordinates | null; onSelect: (position: Coordinates) => void }

export function WorkplaceAddressSearch({ disabled, position, onSelect }: Props) {
  const [query, setQuery] = useState(''), [results, setResults] = useState<WorkplacePlaceSuggestion[] | null>(null)
  const [busy, setBusy] = useState<'suggest' | 'search' | 'detail' | ''>(''), [error, setError] = useState('')
  const [chosen, setChosen] = useState<WorkplacePlace | null>(null)
  const [resultKind, setResultKind] = useState<'suggestions' | 'results'>('results')
  const debounce = useRef<number | null>(null), composing = useRef(false)
  const serial = useRef(0), pending = useRef<AbortController | null>(null)
  const locked = useRef(disabled); locked.current = disabled
  function cancel() {
    if (debounce.current !== null) window.clearTimeout(debounce.current)
    debounce.current = null; serial.current++; pending.current?.abort(); pending.current = null
  }
  useEffect(() => () => {
    if (debounce.current !== null) window.clearTimeout(debounce.current)
    serial.current++; pending.current?.abort()
  }, [])
  useEffect(() => { cancel(); setBusy(''); setResults(null) }, [position?.latitude, position?.longitude])
  useEffect(() => { if (disabled) { cancel(); setBusy('') } }, [disabled])
  function change(value: string) {
    cancel(); setQuery(value); setResults(null); setError(''); setBusy(''); setChosen(null)
    const length = value.trim().length
    if (!locked.current && !composing.current && length >= 3 && length <= 200) {
      debounce.current = window.setTimeout(() => { debounce.current = null; void search(value, 'suggestions') }, 200)
    }
  }
  async function search(text = query, kind: 'suggestions' | 'results' = 'results') {
    if (locked.current || busy === 'detail') return
    cancel(); setError(''); setResults(null); setChosen(null)
    const value = text.trim()
    if (value.length < 3 || value.length > 200) { setError('Nhập địa chỉ từ 3 đến 200 ký tự để tìm kiếm.'); return }
    const request = serial.current, controller = new AbortController(); pending.current = controller; setResultKind(kind); setBusy(kind === 'suggestions' ? 'suggest' : 'search')
    try {
      const values = await searchWorkplacePlaces(value, controller.signal)
      if (request === serial.current && !locked.current) setResults(values.slice(0, 5))
    } catch (failure: unknown) {
      if (request === serial.current) setError(failure instanceof Error ? failure.message : 'Không thể tìm địa chỉ. Hãy thử lại.')
    } finally { if (request === serial.current) { pending.current = null; setBusy('') } }
  }
  async function choose(suggestion: WorkplacePlaceSuggestion) {
    if (locked.current || busy) return
    cancel(); setError(''); const request = serial.current, controller = new AbortController()
    pending.current = controller; setBusy('detail')
    try {
      const place = await getWorkplacePlace(suggestion.placeId, controller.signal)
      if (request !== serial.current || locked.current) return
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) {
        setError('Địa chỉ không có tọa độ hợp lệ. Hãy chọn kết quả khác.'); return
      }
      setQuery(place.label); setChosen(place); setResults(null)
      onSelect({ latitude: place.latitude, longitude: place.longitude })
    } catch (failure: unknown) {
      if (request === serial.current) setError(failure instanceof Error ? failure.message : 'Không thể lấy tọa độ địa chỉ. Hãy thử lại.')
    } finally { if (request === serial.current) { pending.current = null; setBusy('') } }
  }
  const selectionMatches = chosen && position && Math.abs(chosen.latitude - position.latitude) < 0.000001 && Math.abs(chosen.longitude - position.longitude) < 0.000001
  return <div className="workplace-address-search">
    <label htmlFor="workplace-address-query">Tìm địa chỉ</label>
    <div className="workplace-address-input"><input id="workplace-address-query" type="search" value={query} maxLength={200}
      placeholder="Tên đường, tòa nhà hoặc địa điểm" disabled={disabled || busy === 'detail'}
      aria-describedby="workplace-address-help" autoComplete="off"
      onCompositionStart={() => { composing.current = true; cancel(); setBusy(''); setResults(null) }}
      onCompositionEnd={event => { composing.current = false; change(event.currentTarget.value) }}
      onChange={event => change(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void search() } }} />
      <button type="button" disabled={disabled || busy === 'detail' || busy === 'search'} onClick={() => { void search() }}>Tìm kiếm</button></div>
    <p className="workplace-hint" id="workplace-address-help">Gõ từ 3 ký tự để xem gợi ý hoặc bấm Tìm kiếm. Chọn địa chỉ rồi kiểm tra lại ghim trước khi lưu.</p>
    {busy && <p className="workplace-hint" role="status">{busy === 'detail' ? 'Đang lấy tọa độ địa chỉ…' : busy === 'suggest' ? 'Đang tải gợi ý…' : 'Đang tìm địa chỉ…'}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {results && (results.length ? <div><p className="workplace-address-caption">{resultKind === 'suggestions' ? 'Gợi ý địa chỉ' : 'Kết quả tìm kiếm'}</p><ul className="workplace-address-results" aria-label={resultKind === 'suggestions' ? 'Gợi ý địa chỉ' : 'Kết quả địa chỉ'}>{results.map(item =>
      <li key={item.placeId}><button type="button" disabled={disabled || !!busy} onClick={() => { void choose(item) }}>{item.label}</button></li>)}</ul></div>
      : <p className="workplace-hint" role="status">Không tìm thấy địa chỉ phù hợp. Hãy thử từ khóa khác hoặc chọn trực tiếp trên bản đồ.</p>)}
    {selectionMatches && <p className="workplace-address-chosen" role="status">Đã chọn: {chosen.label}.</p>}
  </div>
}
