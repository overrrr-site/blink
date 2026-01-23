const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function formatDateWithWeekday(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatDateFullWithWeekday(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function isToday(dateStr: string): boolean {
  const today = formatDateISO(new Date())
  return dateStr === today
}

export function isPast(dateStr: string): boolean {
  const today = formatDateISO(new Date())
  return dateStr < today
}

export function isFuture(dateStr: string): boolean {
  const today = formatDateISO(new Date())
  return dateStr > today
}
