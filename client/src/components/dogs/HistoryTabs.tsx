import { Icon } from '../Icon'
import { formatDateFullWithWeekday } from '../../utils/date'
import { getBusinessTypeColors } from '../../utils/businessTypeColors'
import { getBusinessTypeConfig, getStatusLabel } from '../../domain/businessTypeConfig'
import type { RecordType } from '../../types/record'

type ReservationItem = {
  id: number
  reservation_date: string
  reservation_time: string
  status: string
  service_type?: string
  owner_name: string
  has_pre_visit?: boolean
}

type JournalItem = {
  id: number
  journal_date: string
  staff_name?: string
  comment?: string
}

type PreVisitItem = {
  id: number
  reservation_id: number
  reservation_date: string
  reservation_time: string
  service_type?: string
  morning_urination?: boolean
  morning_defecation?: boolean
  afternoon_urination?: boolean
  afternoon_defecation?: boolean
  breakfast_status?: string
  health_status?: string
  notes?: string
  meal_data?: any
  grooming_data?: any
  hotel_data?: any
}

type HistoryTabsProps = {
  activeTab: 'reservations' | 'journals' | 'preVisit'
  reservations: ReservationItem[]
  journals: JournalItem[]
  preVisitHistory: PreVisitItem[]
  selectedBusinessType?: RecordType | null
  onTabChange: (tab: 'reservations' | 'journals' | 'preVisit') => void
  onOpenReservation: (id: number) => void
  onOpenJournal: (id: number) => void
}

export default function HistoryTabs({
  activeTab,
  reservations,
  journals,
  preVisitHistory,
  selectedBusinessType,
  onTabChange,
  onOpenReservation,
  onOpenJournal,
}: HistoryTabsProps) {
  // 業種フィルタが選択されている場合、予約をフィルタリング
  const filteredReservations = selectedBusinessType
    ? reservations.filter((r) => r.service_type === selectedBusinessType)
    : reservations

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => onTabChange('reservations')}
            className={`flex-1 py-3 text-sm font-bold active:scale-[0.98] transition-all ${
              activeTab === 'reservations'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            利用履歴
          </button>
          <button
            onClick={() => onTabChange('journals')}
            className={`flex-1 py-3 text-sm font-bold active:scale-[0.98] transition-all ${
              activeTab === 'journals'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            日誌履歴
          </button>
          <button
            onClick={() => onTabChange('preVisit')}
            className={`flex-1 py-3 text-sm font-bold active:scale-[0.98] transition-all ${
              activeTab === 'preVisit'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            事前連絡
          </button>
        </div>
      </div>
      <div className="p-4">
        {activeTab === 'reservations' ? (
          filteredReservations.length > 0 ? (
            <div className="space-y-3">
              {filteredReservations.map((reservation) => {
                const reservationDate =
                  reservation.reservation_date?.split('T')[0] || reservation.reservation_date
                const statusColors: Record<string, string> = {
                  予定: 'bg-chart-4/10 text-chart-4',
                  登園済: 'bg-chart-2/10 text-chart-2',
                  降園済: 'bg-chart-3/10 text-chart-3',
                  キャンセル: 'bg-muted text-muted-foreground',
                }
                const serviceTypeColors = reservation.service_type
                  ? getBusinessTypeColors(reservation.service_type as RecordType)
                  : null
                const serviceTypeConfig = reservation.service_type
                  ? getBusinessTypeConfig(reservation.service_type as RecordType)
                  : null
                const businessTypeForStatus = (reservation.service_type as RecordType | undefined) || selectedBusinessType || null
                const statusLabel = getStatusLabel(businessTypeForStatus, reservation.status)
                const reservationTime = reservation.reservation_time?.slice(0, 5) || reservation.reservation_time
                return (
                  <div
                    key={reservation.id}
                    onClick={() => onOpenReservation(reservation.id)}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-bold">
                          {formatDateFullWithWeekday(reservationDate)}
                        </p>
                        {serviceTypeColors && serviceTypeConfig && !selectedBusinessType && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ color: serviceTypeColors.primary, backgroundColor: serviceTypeColors.pale }}
                          >
                            {serviceTypeConfig.label}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            statusColors[reservation.status] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {statusLabel}
                        </span>
                        {reservation.has_pre_visit && (
                          <span className="flex items-center gap-0.5 text-[10px] text-chart-3 font-medium">
                            <Icon icon="solar:clipboard-check-bold" className="size-3" />
                            事前入力あり
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {reservationTime} / {reservation.owner_name}様
                      </p>
                    </div>
                    <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="solar:calendar-mark-bold" className="size-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">利用履歴はありません</p>
            </div>
          )
        ) : activeTab === 'journals' ? (
          journals.length > 0 ? (
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
                    <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="solar:notebook-bold" className="size-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">日誌履歴はありません</p>
            </div>
          )
        ) : (
          preVisitHistory.length > 0 ? (
            <div className="space-y-3">
              {preVisitHistory.map((pvi) => {
                const pviDate = pvi.reservation_date?.split('T')[0] || pvi.reservation_date
                const pviTime = pvi.reservation_time?.slice(0, 5) || pvi.reservation_time
                return (
                  <div
                    key={pvi.id}
                    className="p-3 bg-muted/30 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-bold">
                        {formatDateFullWithWeekday(pviDate)}
                      </p>
                      <span className="text-xs text-muted-foreground">{pviTime}</span>
                    </div>
                    <div className="space-y-1.5">
                      {pvi.health_status && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">体調:</span>
                          <span className="text-foreground">{pvi.health_status}</span>
                        </div>
                      )}
                      {pvi.breakfast_status && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">朝ごはん:</span>
                          <span className="text-foreground">{pvi.breakfast_status}</span>
                        </div>
                      )}
                      {(pvi.morning_urination || pvi.morning_defecation) && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">朝の排泄:</span>
                          <span className="text-foreground">
                            {[pvi.morning_urination && 'オシッコ', pvi.morning_defecation && 'ウンチ'].filter(Boolean).join('・')}
                          </span>
                        </div>
                      )}
                      {pvi.notes && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">連絡事項:</span>
                          <span className="text-foreground">{pvi.notes}</span>
                        </div>
                      )}
                      {!pvi.health_status && !pvi.breakfast_status && !pvi.notes && !pvi.morning_urination && !pvi.morning_defecation && (
                        <p className="text-xs text-muted-foreground">入力内容なし</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="solar:clipboard-text-bold" className="size-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">事前連絡の履歴はありません</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
