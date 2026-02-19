import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import api from '../api/client'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import BusinessTypeSwitcher from '../components/BusinessTypeSwitcher'
import OverflowMenu from '../components/OverflowMenu'
import { useToast } from '../components/Toast'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import ReservationCard from '../components/ReservationCard'
import type { ReservationCardData } from '../components/ReservationCard'
import CalendarCell from '../components/reservations/CalendarCell'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toReservationDateKey(value: unknown): string | null {
  if (value instanceof Date) {
    return toDateKey(value)
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0]
  }
  if (trimmed.includes(' ')) {
    return trimmed.split(' ')[0]
  }
  return trimmed
}

const ReservationsCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reservations, setReservations] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [draggedReservation, setDraggedReservation] = useState<number | null>(null)
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month')
  const mainRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { selectedBusinessType, effectiveBusinessType, recordLabel } = useBusinessTypeFilter()

  const currentBusinessType = effectiveBusinessType ?? null

  const getCreateUrl = () => {
    switch (selectedBusinessType) {
      case 'grooming':
        return '/reservations/grooming/create'
      case 'hotel':
        return '/reservations/hotel/create'
      default:
        return '/reservations/new'
    }
  }

  const fetchReservations = useCallback(async () => {
    try {
      const monthStr = format(currentDate, 'yyyy-MM')

      const response = await api.get('/reservations', {
        params: {
          month: monthStr,
          service_type: selectedBusinessType || undefined,
        },
      })

      setReservations(response.data)
    } catch {
      // エラー時も空配列を設定して表示を続行
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [currentDate, selectedBusinessType])

  useEffect(() => {
    void fetchReservations()
  }, [fetchReservations])

  // 日付選択が変わったら展開カードをリセット＆週表示に切替
  useEffect(() => {
    setExpandedCard(null)
    if (selectedDate) {
      setCalendarMode('week')
    }
  }, [selectedDate])

  // プルトゥリフレッシュ
  useEffect(() => {
    mainRef.current = document.getElementById('main-content')
  }, [])

  const handleRefresh = useCallback(async () => {
    await fetchReservations()
  }, [fetchReservations])

  const { pullDistance, isRefreshing } = usePullToRefresh({
    scrollRef: mainRef,
    onRefresh: handleRefresh,
  })

  const allDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const paddingDays = Array.from({ length: monthStart.getDay() }, () => null)
    return [...paddingDays, ...days]
  }, [currentDate])

  const { calendarRows, visibleDays } = useMemo(() => {
    const rows: (Date | null)[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      rows.push(allDays.slice(i, i + 7))
    }

    const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null
    const selectedRowIndex = selectedDateKey
      ? rows.findIndex((row) => row.some((day) => day && toDateKey(day) === selectedDateKey))
      : -1

    const nextVisibleDays = calendarMode === 'week' && selectedRowIndex >= 0
      ? rows[selectedRowIndex]
      : allDays

    return {
      calendarRows: rows,
      visibleDays: nextVisibleDays,
    }
  }, [allDays, calendarMode, selectedDate])

  const reservationsByDate = useMemo(() => {
    const indexed = new Map<string, any[]>()
    for (const reservation of reservations) {
      const dateKey = toReservationDateKey(reservation.reservation_date)
      if (!dateKey) continue
      const current = indexed.get(dateKey)
      if (current) {
        current.push(reservation)
        continue
      }
      indexed.set(dateKey, [reservation])
    }
    return indexed
  }, [reservations])

  const selectedDateReservations = useMemo(() => {
    if (!selectedDate) return []
    return reservationsByDate.get(toDateKey(selectedDate)) ?? []
  }, [reservationsByDate, selectedDate])

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null
  const dragOverDateKey = dragOverDate ? toDateKey(dragOverDate) : null

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setCalendarMode('month')
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setCalendarMode('month')
    setSelectedDate(null)
  }

  const handleDragStart = (e: React.DragEvent, reservationId: number) => {
    setDraggedReservation(reservationId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    setDragOverDate(null)

    if (!draggedReservation) return

    const reservation = reservations.find((r) => r.id === draggedReservation)
    if (!reservation) return

    const newDate = toDateKey(targetDate)
    const oldDate = toReservationDateKey(reservation.reservation_date)

    if (newDate === oldDate) {
      setDraggedReservation(null)
      return
    }

    setUpdating(draggedReservation)
    try {
      await api.put(`/reservations/${draggedReservation}`, {
        reservation_date: newDate,
      })
      await fetchReservations()
      setSelectedDate(targetDate)
    } catch {
      showToast('予約の変更に失敗しました', 'error')
    } finally {
      setUpdating(null)
      setDraggedReservation(null)
    }
  }, [draggedReservation, fetchReservations, reservations, showToast])

  const handlePrint = () => {
    api.post('/exports/log', {
      export_type: 'reservations',
      output_format: 'print',
      filters: {
        month: format(currentDate, 'yyyy-MM'),
        service_type: selectedBusinessType || null,
      },
    }).catch(() => undefined)
    window.print()
  }

  const handleExport = () => {
    const monthStr = format(currentDate, 'yyyy-MM')
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_API_URL}/reservations/export.ics?month=${monthStr}`
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `reservations-${monthStr}.ics`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      })
      .catch(() => {
        showToast('カレンダーのエクスポートに失敗しました', 'error')
      })
  }

  // カレンダーの予約データを ReservationCardData に変換
  const toCardData = (r: any): ReservationCardData => ({
    id: r.id,
    dog_id: r.dog_id,
    dog_name: r.dog_name,
    dog_photo: r.dog_photo,
    owner_name: r.owner_name,
    reservation_date: r.reservation_date,
    reservation_time: r.reservation_time || '',
    status: r.status || '予定',
    checked_in_at: r.checked_in_at,
    has_journal: r.has_journal,
    breakfast_status: r.breakfast_status,
    health_status: r.health_status,
    notes: r.notes,
    end_datetime: r.end_datetime,
    service_type: r.service_type,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div className="hidden print:block print:mb-4 print:border-b print:border-border print:pb-4 px-5">
        <h1 className="text-xl font-bold">予約一覧</h1>
        <p className="text-sm text-muted-foreground">{format(currentDate, 'yyyy年MM月')}</p>
      </div>
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10 safe-area-pt">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">予約管理</h1>
          <div className="flex items-center gap-2">
            <OverflowMenu
              className="print:hidden"
              items={[
                { label: '印刷', icon: 'solar:printer-bold', onClick: handlePrint },
                { label: 'iCS出力', icon: 'solar:download-bold', onClick: handleExport },
              ]}
            />
            <button
              onClick={() => navigate(getCreateUrl())}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[44px] print:hidden"
            >
              <Icon icon="solar:add-circle-bold" className="size-4" />
              新規予約
            </button>
            <div className="print:hidden">
              <BusinessTypeSwitcher />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-lg active:scale-95 transition-transform"
            aria-label="前の月"
          >
            <Icon icon="solar:alt-arrow-left-linear"
              className="size-6 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-bold">{format(currentDate, 'yyyy年MM月')}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToNextMonth}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-lg active:scale-95 transition-transform"
              aria-label="次の月"
            >
              <Icon icon="solar:alt-arrow-right-linear"
                className="size-6 text-muted-foreground" />
            </button>
            {selectedDate && (
              <button
                onClick={() => setCalendarMode(prev => prev === 'month' ? 'week' : 'month')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-lg active:scale-95 transition-all"
                aria-label={calendarMode === 'month' ? '週表示に切り替え' : '月表示に切り替え'}
              >
                <Icon
                  icon={calendarMode === 'month' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                  className="size-5 text-muted-foreground"
                />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
            <span
              key={day}
              className={`text-xs font-bold ${
                index === 0 ? 'text-destructive' : index === 6 ? 'text-chart-3' : 'text-muted-foreground'
              }`}
            >
              {day}
            </span>
          ))}
        </div>
      </header>

      <main className="px-5">
        <div className="grid grid-cols-7 gap-1 mb-6">
          {visibleDays.map((day, index) => {
            const dayKey = day ? toDateKey(day) : `empty-${calendarRows.length}-${index}`
            const reservationCount = day ? (reservationsByDate.get(dayKey)?.length ?? 0) : 0
            return (
              <CalendarCell
                key={dayKey}
                day={day}
                reservationCount={reservationCount}
                isSelected={Boolean(day && selectedDateKey === dayKey)}
                isDragOver={Boolean(day && dragOverDateKey === dayKey)}
                onSelect={setSelectedDate}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                isToday={isToday}
              />
            )
          })}
        </div>

        {selectedDate && (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold font-heading flex items-center gap-2">
                <Icon icon="solar:calendar-bold" className="text-primary size-5" />
                {format(selectedDate, 'yyyy年MM月dd日')}の予約
              </h2>
            </div>

            {selectedDateReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon icon="solar:calendar-mark-bold" className="size-10 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">この日の予約はありません</p>
                <p className="text-xs text-muted-foreground mb-4">新しい予約を追加してスケジュールを管理しましょう</p>
                <button
                  onClick={() => navigate(getCreateUrl())}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all"
                  aria-label="新規予約を追加"
                >
                  <Icon icon="solar:add-circle-bold" className="size-5" />
                  新規予約を追加
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, reservation.id)}
                    className={`${
                      draggedReservation === reservation.id ? 'opacity-50' : ''
                    } ${updating === reservation.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <ReservationCard
                      reservation={toCardData(reservation)}
                      isExpanded={expandedCard === reservation.id}
                      onToggle={() => setExpandedCard((prev) => prev === reservation.id ? null : reservation.id)}
                      onNavigatePreVisit={(id) => navigate(`/reservations/${id}`)}
                      onNavigateTraining={(dogId) => navigate(`/dogs/${dogId}/training`)}
                      onNavigateRecord={(id) => navigate(`/records/create/${id}`)}
                      recordLabel={recordLabel}
                      businessType={currentBusinessType}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default ReservationsCalendar
