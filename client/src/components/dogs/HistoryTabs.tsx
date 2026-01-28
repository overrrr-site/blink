import { formatDateFullWithWeekday } from '../../utils/date'

type ReservationItem = {
  id: number
  reservation_date: string
  reservation_time: string
  status: string
  owner_name: string
}

type JournalItem = {
  id: number
  journal_date: string
  staff_name?: string
  comment?: string
}

type HistoryTabsProps = {
  activeTab: 'reservations' | 'journals'
  reservations: ReservationItem[]
  journals: JournalItem[]
  onTabChange: (tab: 'reservations' | 'journals') => void
  onOpenReservation: (id: number) => void
  onOpenJournal: (id: number) => void
}

export default function HistoryTabs({
  activeTab,
  reservations,
  journals,
  onTabChange,
  onOpenReservation,
  onOpenJournal,
}: HistoryTabsProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => onTabChange('reservations')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'reservations'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            利用履歴
          </button>
          <button
            onClick={() => onTabChange('journals')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'journals'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            日誌履歴
          </button>
        </div>
      </div>
      <div className="p-4">
        {activeTab === 'reservations' ? (
          reservations.length > 0 ? (
            <div className="space-y-3">
              {reservations.map((reservation) => {
                const reservationDate =
                  reservation.reservation_date?.split('T')[0] || reservation.reservation_date
                const statusColors: Record<string, string> = {
                  予定: 'bg-chart-4/10 text-chart-4',
                  登園済: 'bg-chart-2/10 text-chart-2',
                  降園済: 'bg-chart-3/10 text-chart-3',
                  キャンセル: 'bg-muted text-muted-foreground',
                }
                return (
                  <div
                    key={reservation.id}
                    onClick={() => onOpenReservation(reservation.id)}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold">
                          {formatDateFullWithWeekday(reservationDate)}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            statusColors[reservation.status] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {reservation.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {reservation.reservation_time} / {reservation.owner_name}様
                      </p>
                    </div>
                    <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground"></iconify-icon>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <iconify-icon icon="solar:calendar-mark-bold" className="size-12 mx-auto mb-2 opacity-50"></iconify-icon>
              <p className="text-sm">利用履歴はありません</p>
            </div>
          )
        ) : journals.length > 0 ? (
          <div className="space-y-3">
            {journals.map((journal) => {
              const journalDate = journal.journal_date?.split('T')[0] || journal.journal_date
              return (
                <div
                  key={journal.id}
                  onClick={() => onOpenJournal(journal.id)}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold">{formatDateFullWithWeekday(journalDate)}</p>
                      {journal.staff_name && (
                        <span className="text-xs text-muted-foreground">担当: {journal.staff_name}</span>
                      )}
                    </div>
                    {journal.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{journal.comment}</p>
                    )}
                  </div>
                  <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground"></iconify-icon>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <iconify-icon icon="solar:notebook-bold" className="size-12 mx-auto mb-2 opacity-50"></iconify-icon>
            <p className="text-sm">日誌履歴はありません</p>
          </div>
        )}
      </div>
    </div>
  )
}
