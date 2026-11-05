const zone = 'Asia/Ho_Chi_Minh'
export function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Date.now()))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value
  return value('year') + '-' + value('month') + '-' + value('day')
}
export function addDays(date: string, days: number) {
  const value = new Date(date + 'T00:00:00Z')
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function monday(date: string) {
  return addDays(date, -((new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7))
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date + 'T00:00:00Z'))
}
export function instantLabel(value: string) {
  const parts = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, year: 'numeric', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value
  return part('day') + '/' + part('month') + '/' + part('year') + ' ' + part('hour') + ':' + part('minute')
}
export function timeLabel(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date('2000-01-01T' + value + 'Z'))
}
