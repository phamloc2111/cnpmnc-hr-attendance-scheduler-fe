import { expect, it } from 'vitest'
import { notificationUrl, pushMessage, registrationWeek } from './payload'
const now = Date.parse('2026-11-15T03:00:00Z')
const data = { employeeId: 'a', title: 'Đăng ký ca', body: 'Chủ nhật', weekStart: '2026-11-16', expiresAt: '2026-11-15T17:00:00Z', tag: 'registration-open' }
it('validates message recipients, expiry and the Monday deep-link date', () => {
  expect(pushMessage({ data }, now)).toEqual(data)
  expect(pushMessage({ data }, Date.parse(data.expiresAt))).toBeNull()
  expect(pushMessage({ data: { ...data, expiresAt: 'invalid' } }, now)).toBeNull()
  expect(pushMessage({ data: { ...data, weekStart: '2026-11-17' } }, now)).toBeNull()
  expect(pushMessage({ data: { ...data, employeeId: '' } }, now)).toBeNull()
  expect(pushMessage({ data: {} }, now)).toBeNull()
})
it.each([null, '2026-11-17', '2026-02-30', '//evil.example', '<script>', '2026-11-16/../accounts'])('rejects invalid date input %s', input => {
  expect(registrationWeek(input)).toBe('')
})
it('builds only an internal registration URL even for unexpected input', () => {
  expect(notificationUrl('2026-11-16')).toBe('/?registrationWeek=2026-11-16#/registrations')
  expect(notificationUrl('https://evil.example')).toBe('/?registrationWeek=#/registrations')
})
