/**
 * JST (Asia/Tokyo) 基準で今日の日付を YYYY-MM-DD 形式で返す。
 * サーバーがUTCで動作していても正しい日本日付を返す。
 */
export function getTodayJST(): string {
  return toDateStringJST(new Date())
}

/**
 * JST 基準で Date を YYYY-MM-DD 形式に変換する。
 */
export function toDateStringJST(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

/**
 * JST 基準で N 日前の日付を YYYY-MM-DD 形式で返す。
 */
export function getDaysAgoJST(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return toDateStringJST(d)
}
