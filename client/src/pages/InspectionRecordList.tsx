import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const InspectionRecordList = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  )

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1])

  useEffect(() => {
    fetchRecords()
  }, [year, month])

  const fetchRecords = async () => {
    try {
      const response = await api.get(`/inspection-records?year=${year}&month=${month}`)
      setRecords(response.data)
    } catch (error) {
      console.error('Error fetching inspection records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    try {
      const response = await api.get(`/inspection-records/export/${year}/${month}`)
      // 印刷用のページを開く
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const { store, records: exportRecords } = response.data

      // 東京都様式に準拠したHTMLを生成
      const html = generatePrintHTML(store, exportRecords, year, month)
      
      printWindow.document.write(html)
      printWindow.document.close()
      
      // 印刷ダイアログを表示
      setTimeout(() => {
        printWindow.print()
      }, 250)
    } catch (error) {
      console.error('Error exporting inspection records:', error)
      alert('印刷データの取得に失敗しました')
    }
  }

  const generatePrintHTML = (store: any, records: any[], year: number, month: number) => {
    const businessTypes = store.business_types || []
    
    // 日付ごとの記録をマップ
    const recordsByDate: Record<string, any> = {}
    records.forEach((record) => {
      recordsByDate[record.inspection_date] = record
    })

    // 月の日数を取得
    const daysInMonth = new Date(year, month, 0).getDate()
    
    let tableRows = ''
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const record = recordsByDate[date]
      const dateObj = new Date(year, month - 1, day)
      const weekday = dateObj.toLocaleDateString('ja-JP', { weekday: 'short' })
      
      const time = record?.inspection_time ? record.inspection_time.slice(0, 5) : ''
      const cleaning = record?.cleaning_done ? '済' : record ? '否' : ''
      const disinfection = record?.disinfection_done ? '済' : record ? '否' : ''
      const maintenance = record?.maintenance_done ? '済' : record ? '否' : ''
      const countAbnormal = record?.animal_count_abnormal ? '有' : record ? '無' : ''
      const stateAbnormal = record?.animal_state_abnormal ? '有' : record ? '無' : ''
      const inspector = record?.inspector_name || ''
      const notes = record?.notes || ''
      
      tableRows += `
        <tr>
          <td>${day}</td>
          <td>${weekday}</td>
          <td>${time}</td>
          <td>${cleaning}</td>
          <td>${disinfection}</td>
          <td>${maintenance}</td>
          <td>${countAbnormal}</td>
          <td>${stateAbnormal}</td>
          <td>${inspector}</td>
          <td>${notes}</td>
        </tr>
      `
    }

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>点検状況記録台帳 ${year}年${month}月</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'MS Gothic', 'MS PGothic', sans-serif;
      font-size: 10px;
      line-height: 1.4;
    }
    h1 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .header-info {
      margin-bottom: 12px;
      font-size: 9px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #000;
      padding: 4px;
      text-align: center;
      font-size: 9px;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .notes {
      margin-top: 8px;
      font-size: 8px;
    }
  </style>
</head>
<body>
  <h1>${year}年${month}月　飼養施設及び動物の点検状況記録台帳</h1>
  
  <div class="header-info">
    <p><strong>第一種動物取扱業の種別:</strong> ${businessTypes.join('　') || '（未設定）'}</p>
    <p><strong>飼養施設の所在地:</strong> ${store.address || '（未設定）'}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>日</th>
        <th>曜日</th>
        <th>点検時間</th>
        <th colspan="3">飼養施設の点検等の状況</th>
        <th colspan="2">動物の数及び状態の点検</th>
        <th>点検担当者氏名</th>
        <th>備考<br>(異常有の内容等)</th>
      </tr>
      <tr>
        <th></th>
        <th></th>
        <th></th>
        <th>清掃</th>
        <th>消毒</th>
        <th>保守点検</th>
        <th>数の異常</th>
        <th>状態の異常</th>
        <th></th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="notes">
    <p><strong>注:</strong> 「動物の数及び状態の点検」で、「異常有」の場合は「備考」欄にその詳細を記入しましょう。</p>
    <p><strong>備考:</strong> この台帳の大きさは、日本産業規格A4とし、5年間保管することが義務付けられています。</p>
  </div>
</body>
</html>
    `
  }

  // カレンダー表示用の日付リスト
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const days: Array<{ day: number; date: string; record: any | null }> = []

    // 空のセル（月初めの空白）
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, date: '', record: null })
    }

    // 日付と記録をマッピング
    const recordsByDate: Record<string, any> = {}
    records.forEach((record) => {
      recordsByDate[record.inspection_date] = record
    })

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        day,
        date,
        record: recordsByDate[date] || null,
      })
    }

    return days
  }, [year, month, records])

  const changeMonth = (delta: number) => {
    const newDate = new Date(year, month - 1 + delta, 1)
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">点検記録台帳</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors min-h-[44px]"
            >
              <iconify-icon icon="solar:printer-bold" width="18" height="18"></iconify-icon>
              印刷
            </button>
          </div>
        </div>

        {/* 月選択 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <iconify-icon icon="solar:alt-arrow-left-linear" width="20" height="20"></iconify-icon>
          </button>
          <h2 className="text-lg font-bold">
            {year}年{month}月
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20"></iconify-icon>
          </button>
        </div>
      </header>

      <main className="px-5">
        {/* カレンダー表示 */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, index) => {
              if (item.day === 0) {
                return <div key={index} className="aspect-square"></div>
              }

              const hasRecord = item.record !== null
              const hasAbnormal = item.record && (item.record.animal_count_abnormal || item.record.animal_state_abnormal)

              return (
                <button
                  key={index}
                  onClick={() => navigate(`/inspection-records/${item.date}`)}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    hasRecord
                      ? hasAbnormal
                        ? 'bg-destructive/10 border-destructive text-destructive'
                        : 'bg-chart-2/10 border-chart-2 text-chart-2'
                      : 'bg-muted/30 border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  <div className="text-xs font-bold">{item.day}</div>
                  {hasRecord && (
                    <div className="text-[8px] mt-0.5">
                      <iconify-icon icon="solar:check-circle-bold" width="12" height="12"></iconify-icon>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-4 rounded border-2 border-chart-2 bg-chart-2/10"></div>
            <span>入力済み</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 rounded border-2 border-destructive bg-destructive/10"></div>
            <span>異常あり</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 rounded border-2 border-border bg-muted/30"></div>
            <span>未入力</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default InspectionRecordList
