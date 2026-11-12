export interface PushMessage {
  employeeId: string
  title: string
  body: string
  weekStart?: string
  expiresAt: string
  tag: string
  type?: string
}

export function registrationWeek(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 1 ? value : ''
}

export function pushMessage(value: unknown, now = Date.now()): PushMessage | null {
  if (!value || typeof value !== 'object' || !('data' in value) || !value.data || typeof value.data !== 'object') return null
  const data = value.data as Record<string, unknown>
  for (const key of ['employeeId', 'title', 'body', 'expiresAt', 'tag']) {
    if (!(key in data) || typeof Reflect.get(data, key) !== 'string') return null
  }
  const message = data as unknown as PushMessage
  if (!message.employeeId || !Number.isFinite(Date.parse(message.expiresAt)) || Date.parse(message.expiresAt) <= now) return null
  if (message.weekStart && !registrationWeek(message.weekStart)) return null
  return {
    ...message,
    title: message.title.slice(0, 120),
    body: message.body.slice(0, 400),
    tag: message.tag.slice(0, 120),
    weekStart: typeof data.weekStart === 'string' ? data.weekStart : undefined,
    type: typeof data.type === 'string' ? data.type : undefined
  }
}

export function notificationUrl(target: string | PushMessage) {
  if (typeof target === 'string') {
    return '/?registrationWeek=' + encodeURIComponent(registrationWeek(target)) + '#/registrations'
  }
  if (target.type === 'SCHEDULE_PUBLISHED' || target.type === 'SHIFT_REMINDER') {
    return '#/employee-schedule'
  }
  return '/?registrationWeek=' + encodeURIComponent(registrationWeek(target.weekStart)) + '#/registrations'
}
