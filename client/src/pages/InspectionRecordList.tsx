import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import api from '../api/client'

interface Staff {
  id: number
  name: string
}

const InspectionRecordList = () => {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [savingDates, setSavingDates] = useState<Set<string>>(new Set())
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  )

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1])

  // デバウンス用のタイマー
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    fetchData()
  }, [year, month])

  const fetchData = async () => {
    try {
      const [recordsRes, staffRes] = await Promise.all([
        api.get(`/inspection-records?year=${year}&month=${month}`),
        api.get('/auth/staff'),
      ])
      setRecords(recordsRes.data)
      setStaffList(staffRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 日付ごとの記録をマップ
  const recordsByDate = useMemo(() => {
    const map: Record<string, any> = {}
    records.forEach((record) => {
      map[record.inspection_date] = record
    })
    return map
  }, [records])

  // デバウンス付き保存関数
  const debouncedSave = useCallback((date: string, data: any) => {
    // 既存のタイマーをクリア
    if (saveTimers.current[date]) {
      clearTimeout(saveTimers.current[date])
    }

    // 新しいタイマーを設定
    saveTimers.current[date] = setTimeout(async () => {
      setSavingDates((prev) => new Set(prev).add(date))
      try {
        const existing = recordsByDate[date]
        if (existing) {
          await api.put(`/inspection-records/${date}`, data)
        } else {
          await api.post('/inspection-records', {
            ...data,
            inspection_date: date,
          })
        }
        // データを再取得
        await fetchData()
      } catch (error) {
        console.error('Error saving inspection record:', error)
        alert('点検記録の保存に失敗しました')
      } finally {
        setSavingDates((prev) => {
          const newSet = new Set(prev)
          newSet.delete(date)
          return newSet
        })
      }
    }, 500)
  }, [recordsByDate])

  // フィールド変更ハンドラー
  const handleFieldChange = useCallback((date: string, field: string, value: boolean | string) => {
    const currentRecord = recordsByDate[date] || {}
    const newData = {
      ...currentRecord,
      [field]: value,
      inspection_date: date,
    }

    // ローカル状態を即座に更新
    setRecords((prev) => {
      const existingIndex = prev.findIndex((r) => r.inspection_date === date)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], [field]: value }
        return updated
      } else {
        return [...prev, newData]
      }
    })

    // デバウンス付きで保存
    debouncedSave(date, newData)
  }, [recordsByDate, debouncedSave])

  const handlePrint = async () => {
    try {
      const response = await api.get(`/inspection-records/export/${year}/${month}`)
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const { store, records: exportRecords } = response.data
      const html = generatePrintHTML(store, exportRecords, year, month)
      
      printWindow.document.write(html)
      printWindow.document.close()
      
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
    const recordsByDateMap: Record<string, any> = {}
    records.forEach((record) => {
      recordsByDateMap[record.inspection_date] = record
    })

    const daysInMonth = new Date(year, month, 0).getDate()
    
    let tableRows = ''
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const record = recordsByDateMap[date]
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

  // 月の日付リストを生成
  const daysInMonth = useMemo(() => {
    const days = new Date(year, month, 0).getDate()
    const dates: string[] = []
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      dates.push(date)
    }
    return dates
  }, [year, month])

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
        {/* カード形式のリスト */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daysInMonth.map((date) => {
            const record = recordsByDate[date] || null
            const dateObj = new Date(date)
            const day = dateObj.getDate()
            const weekday = dateObj.toLocaleDateString('ja-JP', { weekday: 'short' })
            const isSaving = savingDates.has(date)
            const hasAbnormal = record && (record.animal_count_abnormal || record.animal_state_abnormal)

            return (
              <div
                key={date}
                className={`bg-card rounded-2xl border-2 p-4 ${
                  hasAbnormal
                    ? 'border-destructive/30 bg-destructive/5'
                    : record
                    ? 'border-chart-2/30 bg-chart-2/5'
                    : 'border-border'
                }`}
              >
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-lg font-bold">{day}日</h3>
                    <p className="text-xs text-muted-foreground">{weekday}</p>
                  </div>
                  {isSaving && (
                    <iconify-icon
                      icon="solar:spinner-bold"
                      width="20"
                      height="20"
                      class="text-primary animate-spin"
                    ></iconify-icon>
                  )}
                </div>

                {/* 点検時間 */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    点検時間
                  </label>
                  <input
                    type="time"
                    value={record?.inspection_time || ''}
                    onChange={(e) => handleFieldChange(date, 'inspection_time', e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]"
                  />
                </div>

                {/* 飼養施設の点検 */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    飼養施設の点検
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">清掃</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'cleaning_done', true)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            record?.cleaning_done
                              ? 'bg-chart-2 text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          済
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'cleaning_done', false)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            !record?.cleaning_done && record !== null
                              ? 'bg-destructive text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          否
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">消毒</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'disinfection_done', true)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            record?.disinfection_done
                              ? 'bg-chart-2 text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          済
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'disinfection_done', false)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            !record?.disinfection_done && record !== null
                              ? 'bg-destructive text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          否
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">保守点検</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'maintenance_done', true)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            record?.maintenance_done
                              ? 'bg-chart-2 text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          済
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'maintenance_done', false)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            !record?.maintenance_done && record !== null
                              ? 'bg-destructive text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          否
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 動物の点検 */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    動物の点検
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">数の異常</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'animal_count_abnormal', true)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            record?.animal_count_abnormal
                              ? 'bg-destructive text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          有
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'animal_count_abnormal', false)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            !record?.animal_count_abnormal && record !== null
                              ? 'bg-chart-2 text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          無
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">状態の異常</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'animal_state_abnormal', true)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            record?.animal_state_abnormal
                              ? 'bg-destructive text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          有
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(date, 'animal_state_abnormal', false)}
                          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            !record?.animal_state_abnormal && record !== null
                              ? 'bg-chart-2 text-white ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          無
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 担当者 */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    点検担当者
                  </label>
                  <select
                    value={record?.inspector_name || ''}
                    onChange={(e) => handleFieldChange(date, 'inspector_name', e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]"
                  >
                    <option value="">選択してください</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.name}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 備考（異常がある場合または常に表示） */}
                {(hasAbnormal || record) && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      備考
                    </label>
                    <textarea
                      value={record?.notes || ''}
                      onChange={(e) => handleFieldChange(date, 'notes', e.target.value)}
                      className="w-full h-20 bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="異常有の内容等を記入..."
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default InspectionRecordList
