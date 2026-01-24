import jsPDF from 'jspdf'

// PDFを作成
// 注意: 日本語フォントの読み込みは現在無効化されています
// 日本語が正しく表示されない場合は、CSV形式でのエクスポートをご利用ください
export async function createJapanesePDF(): Promise<jsPDF> {
  const doc = new jsPDF()
  
  // 日本語フォントの読み込みは@pdfme/commonへの依存によりビルドエラーが発生するため
  // 一時的に無効化しています
  // 将来的には、フォントファイルを直接読み込む方法に変更予定
  
  return doc
}

// PDF用のテキストをサニタイズ（日本語対応）
export function sanitizeTextForPDF(text: string | null | undefined): string {
  if (!text) return ''
  // 改行を保持しつつ、制御文字を除去
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

// 日付をフォーマット
export function formatDateForPDF(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('ja-JP')
  } catch {
    return String(date)
  }
}
