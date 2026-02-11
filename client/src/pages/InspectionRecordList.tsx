import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Icon } from '../components/Icon'
import PageHeader from '../components/PageHeader'
import api from '../api/client'
import { useToast } from '../components/Toast'
import type { Staff } from '../types/staff'

interface InspectionRecord {
  id?: number
  inspection_date: string
  inspection_time: string | null
  cleaning_done: boolean
  disinfection_done: boolean
  maintenance_done: boolean
  animal_count_abnormal: boolean
  animal_state_abnormal: boolean
  inspector_name: string | null
  notes: string | null
}

// --- Sub-components ---

interface ToggleButtonPairProps {
  label: string
  field: string
  date: string
  value: boolean | undefined
  record: InspectionRecord | null
  positiveLabel: string
  negativeLabel: string
  /** When true, the positive button is green (good) and the negative is red (bad). Reversed when false. */
  positiveIsGood: boolean
  onFieldChange: (date: string, field: string, value: boolean) => void
}

function ToggleButtonPair({
  label,
  field,
  date,
  value,
  record,
  positiveLabel,
  negativeLabel,
  positiveIsGood,
  onFieldChange,
}: ToggleButtonPairProps): JSX.Element {
  const activeColor = positiveIsGood
    ? 'bg-chart-2 text-white ring-2 ring-primary'
    : 'bg-destructive text-white ring-2 ring-primary'
  const inactiveColor = positiveIsGood
    ? 'bg-destructive text-white ring-2 ring-primary'
    : 'bg-chart-2 text-white ring-2 ring-primary'
  const defaultColor = 'bg-muted text-muted-foreground hover:bg-muted/80'

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onFieldChange(date, field, true)}
          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
            value ? activeColor : defaultColor
          }`}
        >
          {positiveLabel}
        </button>
        <button
          type="button"
          onClick={() => onFieldChange(date, field, false)}
          className={`min-w-[60px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
            !value && record !== null ? inactiveColor : defaultColor
          }`}
        >
          {negativeLabel}
        </button>
      </div>
    </div>
  )
}

function SaveStatus({ isSaving, hasRecord }: { isSaving: boolean; hasRecord: boolean }): JSX.Element {
  if (isSaving) {
    return (
      <div className="pt-2 flex items-center justify-center">
        <div className="flex items-center gap-2 text-primary">
          <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
          <span className="text-sm font-medium">保存中...</span>
        </div>
      </div>
    )
  }

  if (hasRecord) {
    return (
      <div className="pt-2 flex items-center justify-center">
        <div className="flex items-center gap-2 text-chart-2">
          <Icon icon="solar:check-circle-bold" width="20" height="20" />
          <span className="text-sm font-medium">保存済み</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2 flex items-center justify-center">
      <p className="text-xs text-muted-foreground">入力すると自動保存されます</p>
    </div>
  )
}

interface DayCardProps {
  date: string
  record: InspectionRecord | null
  isExpanded: boolean
  isSaving: boolean
  staffList: Staff[]
  onToggleExpanded: () => void
  onFieldChange: (date: string, field: string, value: boolean | string) => void
}

function DayCard({
  date,
  record,
  isExpanded,
  isSaving,
  staffList,
  onToggleExpanded,
  onFieldChange,
}: DayCardProps): JSX.Element {
  const dateObj = new Date(date)
  const day = dateObj.getDate()
  const weekday = dateObj.toLocaleDateString('ja-JP', { weekday: 'short' })
  const hasAbnormal = record && (record.animal_count_abnormal || record.animal_state_abnormal)

  let borderClass = 'border-border'
  if (hasAbnormal) {
    borderClass = 'border-destructive/30 bg-destructive/5'
  } else if (record) {
    borderClass = 'border-chart-2/30 bg-chart-2/5'
  }

  return (
    <div id={`day-card-${date}`} className={`bg-card rounded-2xl border-2 ${borderClass}`}>
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-4 border-b border-border"
      >
        <div className="text-left">
          <h3 className="text-lg font-bold">{day}日</h3>
          <p className="text-xs text-muted-foreground">{weekday}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <Icon icon="solar:spinner-bold" width="20" height="20" className="text-primary animate-spin" />
          )}
          <Icon
            icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
            width="20"
            height="20"
            className="text-muted-foreground"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">点検時間</label>
            <input
              type="time"
              value={record?.inspection_time || ''}
              onChange={(e) => onFieldChange(date, 'inspection_time', e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">飼養施設の点検</label>
            <div className="space-y-2">
              <ToggleButtonPair label="清掃" field="cleaning_done" date={date} value={record?.cleaning_done} record={record} positiveLabel="済" negativeLabel="否" positiveIsGood onFieldChange={onFieldChange} />
              <ToggleButtonPair label="消毒" field="disinfection_done" date={date} value={record?.disinfection_done} record={record} positiveLabel="済" negativeLabel="否" positiveIsGood onFieldChange={onFieldChange} />
              <ToggleButtonPair label="保守点検" field="maintenance_done" date={date} value={record?.maintenance_done} record={record} positiveLabel="済" negativeLabel="否" positiveIsGood onFieldChange={onFieldChange} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-2 block">動物の点検</label>
            <div className="space-y-2">
              <ToggleButtonPair label="数の異常" field="animal_count_abnormal" date={date} value={record?.animal_count_abnormal} record={record} positiveLabel="有" negativeLabel="無" positiveIsGood={false} onFieldChange={onFieldChange} />
              <ToggleButtonPair label="状態の異常" field="animal_state_abnormal" date={date} value={record?.animal_state_abnormal} record={record} positiveLabel="有" negativeLabel="無" positiveIsGood={false} onFieldChange={onFieldChange} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">点検担当者</label>
            <select
              value={record?.inspector_name || ''}
              onChange={(e) => onFieldChange(date, 'inspector_name', e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="">選択してください</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.name}>{staff.name}</option>
              ))}
            </select>
          </div>

          {(hasAbnormal || record) && (
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">備考</label>
              <textarea
                value={record?.notes || ''}
                onChange={(e) => onFieldChange(date, 'notes', e.target.value)}
                className="w-full h-20 bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="異常有の内容等を記入..."
              />
            </div>
          )}

          <SaveStatus isSaving={isSaving} hasRecord={record !== null} />
        </div>
      )}
    </div>
  )
}

// --- Print HTML generator ---

function generatePrintHTML(
  store: { business_types?: string[]; address?: string },
  records: InspectionRecord[],
  year: number,
  month: number
): string {
  const businessTypes = store.business_types || []
  const recordsByDateMap: Record<string, InspectionRecord> = {}
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

// --- Main component ---

function toggleSetItem(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string): void {
  setter((prev) => {
    const next = new Set(prev)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    return next
  })
}

function InspectionRecordList(): JSX.Element {
  const { showToast } = useToast()
  const [records, setRecords] = useState<InspectionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [savingDates, setSavingDates] = useState<Set<string>>(new Set())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const currentDate = new Date()
  const today = currentDate.toISOString().split('T')[0]
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  )

  const year = parseInt(selectedMonth.split('-')[0])
  const month = parseInt(selectedMonth.split('-')[1])

  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const savedRecordIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [year, month])

  useEffect(() => {
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    if (year === currentYear && month === currentMonth) {
      setExpandedDates(new Set([today]))
    } else {
      setExpandedDates(new Set())
    }
  }, [year, month, today])

  const fetchData = async () => {
    try {
      const [recordsRes, staffRes] = await Promise.all([
        api.get(`/inspection-records?year=${year}&month=${month}`),
        api.get('/auth/staff'),
      ])
      setRecords(recordsRes.data)
      setStaffList(staffRes.data)
      recordsRes.data.forEach((record: InspectionRecord) => {
        savedRecordIds.current.add(record.inspection_date)
      })
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const recordsByDate = useMemo(() => {
    const map: Record<string, InspectionRecord> = {}
    records.forEach((record) => {
      map[record.inspection_date] = record
    })
    return map
  }, [records])

  const debouncedSave = useCallback((date: string, data: Omit<InspectionRecord, 'id' | 'inspection_date'>, isExistingRecord: boolean) => {
    if (saveTimers.current[date]) {
      clearTimeout(saveTimers.current[date])
    }

    saveTimers.current[date] = setTimeout(async () => {
      setSavingDates((prev) => new Set(prev).add(date))
      try {
        const shouldUpdate = isExistingRecord || savedRecordIds.current.has(date)

        if (shouldUpdate) {
          await api.put(`/inspection-records/${date}`, data)
        } else {
          try {
            await api.post('/inspection-records', {
              ...data,
              inspection_date: date,
            })
            savedRecordIds.current.add(date)
          } catch (postError) {
            const status = (postError as { response?: { status?: number } })?.response?.status
            if (status === 400) {
              await api.put(`/inspection-records/${date}`, data)
              savedRecordIds.current.add(date)
            } else {
              throw postError
            }
          }
        }
      } catch {
        showToast('点検記録の保存に失敗しました', 'error')
        await fetchData()
      } finally {
        setSavingDates((prev) => {
          const newSet = new Set(prev)
          newSet.delete(date)
          return newSet
        })
      }
    }, 500)
  }, [])

  const handleFieldChange = useCallback((date: string, field: string, value: boolean | string) => {
    const currentRecord = recordsByDate[date] || {}
    const isExistingRecord = !!currentRecord.id

    const newData = {
      inspection_time: currentRecord.inspection_time || null,
      cleaning_done: currentRecord.cleaning_done || false,
      disinfection_done: currentRecord.disinfection_done || false,
      maintenance_done: currentRecord.maintenance_done || false,
      animal_count_abnormal: currentRecord.animal_count_abnormal || false,
      animal_state_abnormal: currentRecord.animal_state_abnormal || false,
      inspector_name: currentRecord.inspector_name || null,
      notes: currentRecord.notes || null,
      [field]: value,
    }

    setRecords((prev) => {
      const existingIndex = prev.findIndex((r) => r.inspection_date === date)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], [field]: value }
        return updated
      } else {
        return [...prev, { ...newData, inspection_date: date }]
      }
    })

    debouncedSave(date, newData, isExistingRecord)
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
    } catch {
      showToast('印刷データの取得に失敗しました', 'error')
    }
  }

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

  const toggleDate = useCallback((date: string) => {
    toggleSetItem(setExpandedDates, date)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="点検記録台帳"
        rightContent={
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors min-h-[44px]"
          >
            <Icon icon="solar:printer-bold" width="18" height="18" />
            印刷
          </button>
        }
      />

      <div className="px-5 pt-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[44px]"
            aria-label="前月"
          >
            <Icon icon="solar:alt-arrow-left-linear" width="20" height="20" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {year}年{month}月
            </h2>
            {year === currentDate.getFullYear() && month === currentDate.getMonth() + 1 && (
              <button
                onClick={() => {
                  setExpandedDates(new Set([today]))
                  // 今日のカードまでスクロール
                  setTimeout(() => {
                    const todayCard = document.getElementById(`day-card-${today}`)
                    if (todayCard) {
                      todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }, 100)
                }}
                className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors min-h-[32px]"
              >
                今日
              </button>
            )}
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[44px]"
            aria-label="次月"
          >
            <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" />
          </button>
        </div>
      </div>

      <main className="px-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daysInMonth.map((date) => (
            <DayCard
              key={date}
              date={date}
              record={recordsByDate[date] || null}
              isExpanded={expandedDates.has(date)}
              isSaving={savingDates.has(date)}
              staffList={staffList}
              onToggleExpanded={() => toggleDate(date)}
              onFieldChange={handleFieldChange}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default InspectionRecordList
