import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { WeekTimeGrid } from './WeekTimeGrid'
import type { WorkSchedule } from './types'

function shift(id: string, date: string, start: string): WorkSchedule {
  return { id, employeeId: 'employee', employeeName: 'An', shiftTemplateId: 'template', workDate: date, shiftName: id,
    startsAt: `${date}T${start}:00+07:00`, endsAt: `${date}T18:00:00+07:00`, breakMinutes: 0, workingMinutes: 60, timezone: 'Asia/Ho_Chi_Minh' }
}
afterEach(() => vi.restoreAllMocks())

it('scrolls to the first shift today even when another day starts earlier', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-07T10:00:00+07:00'))
  render(<WeekTimeGrid week="2026-11-02" shifts={[shift('Monday', '2026-11-02', '08:00'), shift('Afternoon', '2026-11-07', '13:46'), shift('Later', '2026-11-07', '16:00')]} onSelect={() => {}} />)
  const calendar = screen.getByRole('region', { name: 'Lưới lịch tuần theo giờ' })
  expect(calendar.scrollTop).toBeCloseTo((13 + 46 / 60) * 64 - 12)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Th 2, 02/11/2026' }))
  expect(calendar.scrollTop).toBe(8 * 64 - 12)
})

it('uses the earliest shift as a fallback when today has no shifts', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-07T10:00:00+07:00'))
  render(<WeekTimeGrid week="2026-11-02" shifts={[shift('Afternoon', '2026-11-05', '13:46')]} onSelect={() => {}} />)
  expect(screen.getByRole('region').scrollTop).toBeCloseTo((13 + 46 / 60) * 64 - 12)
})

it('keeps empty weeks at a usable default and overnight continuations at midnight', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-07T10:00:00+07:00'))
  const { rerender } = render(<WeekTimeGrid week="2026-11-02" shifts={[]} onSelect={() => {}} />)
  expect(screen.getByRole('region').scrollTop).toBe(7 * 64 - 12)
  const night = { ...shift('Night', '2026-11-06', '22:00'), endsAt: '2026-11-07T06:00:00+07:00' }
  rerender(<WeekTimeGrid week="2026-11-02" shifts={[night]} onSelect={() => {}} />)
  expect(screen.getByRole('region').scrollTop).toBe(0)
})
