import { useEffect, useId, useRef, useState } from 'react'
import { getAccount, listAccounts } from './api'
import type { Account } from './types'

export function ManagerSelect({ value, disabled, onChange }: {
  value: string; disabled: boolean; onChange: (id: string) => void
}) {
  const id = useId()
  const listId = id + '-options'
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Account | null>(null)
  const [options, setOptions] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedError, setSelectedError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (!value) { setSelected(null); setSelectedError(''); return }
    if (selected?.id === value) return
    let active = true
    setSelectedError('')
    getAccount(value).then(account => {
      if (active) setSelected(account)
    }).catch(() => {
      if (active) setSelectedError('Chưa tải được tên quản lý hiện tại.')
    })
    return () => { active = false }
  }, [value, selected?.id, attempt])

  useEffect(() => {
    if (!open || disabled) return
    let active = true
    setLoading(true)
    setError('')
    setOptions([])
    setActiveIndex(-1)
    const timer = window.setTimeout(() => {
      listAccounts({ q: query.trim(), role: 'MANAGER', locked: 'false', page: 0 }, 100)
        .then(page => { if (active) setOptions(page.items) })
        .catch((failure: unknown) => {
          if (active) setError(failure instanceof Error ? failure.message : 'Không thể tải danh sách quản lý.')
        }).finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [open, disabled, query, attempt])

  useEffect(() => {
    if (open && activeIndex >= 0) {
      document.getElementById(listId + '-' + activeIndex)?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [open, activeIndex, listId])

  function close() { setOpen(false); setQuery(''); setActiveIndex(-1) }
  function choose(account: Account | null) {
    setSelected(account)
    setSelectedError('')
    onChange(account?.id ?? '')
    close()
  }
  const label = !value ? 'Chưa phân công' : selected?.id === value
    ? selected.displayName + ' · ' + selected.email
    : selectedError ? 'Quản lý hiện tại' : 'Đang tải quản lý…'

  return <div className="manager-field" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) close()
  }}>
    <label htmlFor={id}>Người quản lý</label>
    <div className="manager-combobox">
      <input ref={input} id={id} role="combobox" type="text" autoComplete="off"
        aria-autocomplete="list" aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? listId + '-' + activeIndex : undefined}
        value={open && !disabled ? query : label} disabled={disabled}
        placeholder="Chọn hoặc nhập tên, email quản lý"
        onFocus={() => { setQuery(''); setOpen(true) }}
        onClick={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1) }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            setActiveIndex(index => event.key === 'ArrowDown'
              ? Math.min(index + 1, options.length) : Math.max(index - 1, 0))
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            if (activeIndex === 0) choose(null)
            else if (activeIndex > 0 && options[activeIndex - 1]) choose(options[activeIndex - 1])
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            close()
          }
        }} />
      <span className="manager-chevron" aria-hidden="true">⌄</span>
    </div>
    {open && !disabled && <div className="manager-popup">
      <ul id={listId} role="listbox" aria-label="Danh sách quản lý">
        <li id={listId + '-0'} role="option" aria-selected={!value}
          className={activeIndex === 0 ? 'highlighted' : ''}
          onMouseDown={event => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(0)} onClick={() => choose(null)}>Chưa phân công</li>
        {options.map((manager, index) => <li key={manager.id} id={listId + '-' + (index + 1)}
          role="option" aria-selected={manager.id === value}
          className={activeIndex === index + 1 ? 'highlighted' : ''}
          onMouseDown={event => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index + 1)} onClick={() => choose(manager)}>
          <strong>{manager.displayName}</strong><span>{manager.email}</span>
        </li>)}
      </ul>
      {loading && <p className="manager-feedback" role="status">Đang tìm quản lý…</p>}
      {!loading && !error && options.length === 0
        && <p className="manager-feedback">Không tìm thấy quản lý phù hợp.</p>}
      {error && <div className="manager-feedback"><p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div>}
    </div>}
    {selectedError && <div className="manager-feedback"><span role="status">{selectedError}</span>
      <button type="button" onClick={() => setAttempt(value => value + 1)}>Tải lại tên quản lý</button></div>}
  </div>
}
