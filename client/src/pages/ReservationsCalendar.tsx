import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import api from '../api/client'
import { useBusinessTypeStore } from '../store/businessTypeStore'

const ReservationsCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reservations, setReservations] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateReservations, setSelectedDateReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedReservation, setDraggedReservation] = useState<number | null>(null)
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const navigate = useNavigate()
  const { selectedBusinessType } = useBusinessTypeStore()

  useEffect(() => {
    fetchReservations()
  }, [currentDate, selectedBusinessType])

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      setSelectedDateReservations(
        reservations.filter((r) => {
          // reservation_date が ISO 形式の場合は 'yyyy-MM-dd' に変換
          const reservationDate = r.reservation_date instanceof Date 
            ? format(r.reservation_date, 'yyyy-MM-dd')
            : r.reservation_date?.split('T')[0] || r.reservation_date
          return reservationDate === dateStr
        })
      )
    }
  }, [selectedDate, reservations])

  const fetchReservations = async () => {
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
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // カレンダーの前後の空白日を追加
  const firstDayOfWeek = monthStart.getDay()
  const paddingDays = []
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    paddingDays.push(null)
  }
  
  const allDays = [...paddingDays, ...days]
  
  const getReservationsForDate = (date: Date | null) => {
    if (!date) return []
    const dateStr = format(date, 'yyyy-MM-dd')
    return reservations.filter((r) => {
      // reservation_date が ISO 形式の場合は 'yyyy-MM-dd' に変換
      const reservationDate = r.reservation_date instanceof Date 
        ? format(r.reservation_date, 'yyyy-MM-dd')
        : r.reservation_date?.split('T')[0] || r.reservation_date
      return reservationDate === dateStr
    })
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDragStart = (e: React.DragEvent, reservationId: number) => {
    setDraggedReservation(reservationId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    setDragOverDate(null)

    if (!draggedReservation) return

    const reservation = reservations.find((r) => r.id === draggedReservation)
    if (!reservation) return

    const newDate = format(targetDate, 'yyyy-MM-dd')
    const oldDate = reservation.reservation_date?.split('T')[0] || reservation.reservation_date

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
      alert('予約の変更に失敗しました')
    } finally {
      setUpdating(null)
      setDraggedReservation(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">予約管理</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
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
                    alert('カレンダーのエクスポートに失敗しました')
                  })
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
              aria-label="カレンダーをエクスポート"
              title="iCS形式でエクスポート"
            >
              <Icon icon="solar:download-bold" className="size-5" />
            </button>
            <button
              onClick={() => navigate('/reservations/new')}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:add-circle-bold" className="size-4" />
              新規予約
            </button>
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
          <button 
            onClick={goToNextMonth} 
            className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-lg active:scale-95 transition-transform"
            aria-label="次の月"
          >
            <Icon icon="solar:alt-arrow-right-linear"
              className="size-6 text-muted-foreground" />
          </button>
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
          {allDays.map((day, index) => {
            if (!day) {
              return <div key={index} className="aspect-square"></div>
            }

            const dayReservations = getReservationsForDate(day)
            const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

            const isDragOver = dragOverDate && format(day, 'yyyy-MM-dd') === format(dragOverDate, 'yyyy-MM-dd')
            
            return (
              <div
                key={day.toISOString()}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
                className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-colors relative ${
                  isDragOver
                    ? 'bg-chart-2/20 border-2 border-chart-2 border-dashed'
                    : isToday(day) && !isSelected
                    ? 'bg-primary/10 border-2 border-primary'
                    : isSelected
                    ? 'bg-primary text-primary-foreground'
                    : dayReservations.length > 0
                    ? 'bg-primary/5 border border-primary/20'
                    : 'hover:bg-muted'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedDate(day)
                  }}
                  className="w-full h-full flex flex-col items-center justify-start min-h-[48px]"
                  aria-label={`${format(day, 'M月d日')}の予約を表示`}
                >
                  <span className={`text-xs ${isSelected ? 'font-bold' : isToday(day) ? 'font-semibold' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayReservations.length > 0 && (
                    <div className="flex items-center justify-center mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-white/30 text-white' 
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        {dayReservations.length}件
                      </span>
                    </div>
                  )}
                </button>
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-chart-2/30 rounded-lg">
                    <Icon icon="solar:arrow-down-bold" className="size-6 text-chart-2" />
                  </div>
                )}
              </div>
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
                  onClick={() => navigate('/reservations/new')}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
                  aria-label="新規予約を追加"
                >
                  <Icon icon="solar:add-circle-bold" className="size-5" />
                  新規予約を追加
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, reservation.id)}
                    onClick={() => navigate(`/reservations/${reservation.id}`)}
                    className={`bg-card rounded-2xl p-4 border border-border shadow-sm cursor-move hover:shadow-md transition-all ${
                      draggedReservation === reservation.id ? 'opacity-50' : ''
                    } ${updating === reservation.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {reservation.dog_photo ? (
                        <img
                          src={reservation.dog_photo}
                          alt={reservation.dog_name}
                          className="size-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                          <Icon icon="solar:paw-print-bold"
                            className="size-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{reservation.dog_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {reservation.owner_name} 様
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">
                          {reservation.reservation_time?.substring(0, 5)}
                        </p>
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                          {reservation.status || '予定'}
                        </span>
                      </div>
                    </div>
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
