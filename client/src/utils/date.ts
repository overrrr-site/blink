const JST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const JST_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  weekday: 'short',
})

function getJstDateParts(date: Date): { year: string; month: string; day: string } {
  const parts = JST_DATE_FORMATTER.formatToParts(date)
  return {
    year: parts.find((part) => part.type === 'year')?.value ?? '0000',
    month: parts.find((part) => part.type === 'month')?.value ?? '01',
    day: parts.find((part) => part.type === 'day')?.value ?? '01',
  }
}

export function formatDateWithWeekday(dateStr: string): string {
  const date = new Date(dateStr)
  const { month, day } = getJstDateParts(date)
  return `${Number(month)}/${Number(day)}（${JST_WEEKDAY_FORMATTER.format(date)}）`
}

export function formatDateFullWithWeekday(dateStr: string): string {
  const date = new Date(dateStr)
  const { year, month, day } = getJstDateParts(date)
  return `${year}年${Number(month)}月${Number(day)}日（${JST_WEEKDAY_FORMATTER.format(date)}）`
}

export function formatDateISO(date: Date): string {
  const { year, month, day } = getJstDateParts(date)
  return `${year}-${month}-${day}`
}
