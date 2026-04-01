const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function parseDateStringAsUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * JST (UTC+9) 基準で今日の日付を YYYY-MM-DD 形式で返す。
 * サーバーがUTCで動作していても正しい日本日付を返す。
 */
export function getTodayJST(): string {
  return toDateStringJST(new Date())
}

/**
 * JST 基準で Date を YYYY-MM-DD 形式に変換する。
 * ロケール依存を避け、UTC+9 の算術変換で確実に動作する。
 */
export function toDateStringJST(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  return jst.toISOString().split('T')[0]
}

export function toCompactDateStringJST(date: Date): string {
  return toDateStringJST(date).replace(/-/g, '')
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateStringAsUtc(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]
}

export function addMonthsToDateString(dateStr: string, months: number): string {
  const date = parseDateStringAsUtc(dateStr)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().split('T')[0]
}

export function getDayOfWeekFromDateString(dateStr: string): number {
  return parseDateStringAsUtc(dateStr).getUTCDay()
}

/**
 * JST 基準で N 日前の日付を YYYY-MM-DD 形式で返す。
 */
export function getDaysAgoJST(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return toDateStringJST(d)
}
