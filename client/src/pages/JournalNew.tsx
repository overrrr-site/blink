import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDateWithWeekday } from '../utils/date'

interface Reservation {
  id: number
  reservation_id?: number
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  reservation_date: string
  journal_date?: string
  reservation_time: string
}

function JournalNew(): JSX.Element {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])

  useEffect(() => {
    fetchReservationsWithoutJournal()
  }, [])

  async function fetchReservationsWithoutJournal(): Promise<void> {
    try {
      const response = await api.get('/dashboard')
      const incompleteJournals = response.data.incompleteJournals || []
      setReservations(incompleteJournals)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function getReservationId(reservation: Reservation): number | null {
    return reservation.reservation_id || reservation.id || null
  }

  function getReservationDate(reservation: Reservation): string {
    return reservation.reservation_date || reservation.journal_date || ''
  }

  // 有効な予約のみをフィルタリング（reservation_idがnullでないもの）
  const validReservations = reservations.filter(r => getReservationId(r) !== null)

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="pb-6">
      <PageHeader title="日誌を作成" backPath="/journals" />

      <main className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          日誌を作成する予約を選択してください
        </p>

        {validReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icon icon="solar:check-circle-bold" width="40" height="40" className="text-chart-2" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">すべての日誌が入力済みです</p>
            <p className="text-sm text-muted-foreground mb-6">未入力の日誌はありません</p>
            <button
              onClick={() => navigate('/reservations')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium active:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:calendar-bold" width="20" height="20" />
              予約カレンダーを開く
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {validReservations.map((reservation) => (
              <button
                key={getReservationId(reservation)!}
                onClick={() => navigate(`/journals/create/${getReservationId(reservation)}`)}
                className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left hover:shadow-md transition-shadow"
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
                      <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base">{reservation.dog_name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {reservation.owner_name} 様
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {formatDateWithWeekday(getReservationDate(reservation))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.reservation_time || ''}
                    </p>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default JournalNew
