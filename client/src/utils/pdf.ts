import jsPDF from 'jspdf'

// NotoSansJP フォントを使用したPDFを作成
export async function createJapanesePDF(): Promise<jsPDF> {
  const doc = new jsPDF()
  
  try {
    // pdfmeのデフォルトフォント（NotoSansJP）を動的インポートで取得
    const { getDefaultFont } = await import('@pdfme/common')
    const font = await getDefaultFont()
    
    // フォントをjsPDFに登録
    if (font['NotoSansJP-Regular']) {
      const fontData = font['NotoSansJP-Regular'].data
      let fontBase64: string
      
      // フォントデータをBase64文字列に変換
      if (typeof fontData === 'string') {
        fontBase64 = fontData
      } else if (fontData instanceof ArrayBuffer) {
        fontBase64 = btoa(
          new Uint8Array(fontData).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
      } else if (fontData instanceof Uint8Array) {
        fontBase64 = btoa(
          fontData.reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
      } else {
        throw new Error('Unsupported font data type')
      }
      
      doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64)
      doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal')
      doc.setFont('NotoSansJP')
    }
  } catch (error) {
    console.warn('日本語フォントの読み込みに失敗しました。デフォルトフォントを使用します。', error)
  }
  
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
