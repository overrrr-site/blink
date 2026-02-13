import React from 'react'
import { Icon } from './Icon'
import { getAvatarUrl } from '../utils/image'
import { getDashboardStatusLabels } from '../domain/businessTypeConfig'
import type { RecordType } from '../types/record'
import {
  getDisplayStatus,
  getReservationStatusLabel,
  hasPreVisitInput,
} from './dashboard/reservationCardModel'

export interface ReservationCardData {
  id: number
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  reservation_date: string
  reservation_time: string
  status: '予定' | '登園済' | '降園済' | 'キャンセル'
  checked_in_at?: string
  has_journal?: boolean
  // 飼い主からの事前入力
  pvi_morning_urination?: boolean
  pvi_morning_defecation?: boolean
  breakfast_status?: string
  health_status?: string
  notes?: string
  end_datetime?: string
  service_type?: string
}

export { getDisplayStatus, hasPreVisitInput }
export { getReservationStatusLabel as getStatusLabel } from './dashboard/reservationCardModel'

interface ReservationCardProps {
  reservation: ReservationCardData
  isExpanded: boolean
  onToggle: () => void
  onCheckIn?: (id: number) => void
  onCheckOut?: (id: number) => void
  onNavigatePreVisit?: (id: number) => void
  onNavigateTraining: (dogId: number) => void
  onNavigateRecord: (id: number) => void
  onNavigateJournal?: (id: number) => void
  checkingIn?: number | null
  recordLabel: string
  businessType: RecordType | null
}

const ReservationCard = React.memo(function ReservationCard({
  reservation,
  isExpanded,
  onToggle,
  onCheckIn,
  onCheckOut,
  onNavigatePreVisit,
  onNavigateTraining,
  onNavigateRecord,
  onNavigateJournal,
  checkingIn,
  recordLabel,
  businessType,
}: ReservationCardProps) {
  const displayStatus = getDisplayStatus(reservation)
  const isWaiting = displayStatus === '来園待ち'
  const isPresent = displayStatus === '在園中'
  const labels = getDashboardStatusLabels(businessType)

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className="w-full p-3 flex items-center gap-3 text-left cursor-pointer"
      >
        <div className="size-10 rounded-full overflow-hidden bg-muted shrink-0">
          {reservation.dog_photo ? (
            <img
              src={getAvatarUrl(reservation.dog_photo)}
              alt={reservation.dog_name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon="solar:paw-print-bold" className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">{reservation.dog_name}</h3>
            {hasPreVisitInput(reservation) && (
              <span aria-label="飼い主さんからの連絡あり">
                <Icon icon="solar:clipboard-check-bold" className="size-4 text-chart-3" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {(() => {
              const startTime = reservation.reservation_time
                ? reservation.reservation_time.substring(0, 5)
                : ''
              const endTime = reservation.end_datetime
                ? reservation.end_datetime.includes('T')
                  ? reservation.end_datetime.split('T')[1].substring(0, 5)
                  : reservation.end_datetime.split(' ')[1]?.substring(0, 5) || ''
                : ''
              if (startTime && endTime) {
                return `${startTime}〜${endTime} / ${reservation.owner_name}様`
              }
              if (startTime) {
                return `${startTime} / ${reservation.owner_name}様`
              }
              return `${reservation.owner_name}様`
            })()}
          </p>
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {isWaiting && onCheckIn && onCheckOut && (
            <button
              onClick={() => businessType === 'grooming'
                ? onCheckOut(reservation.id)
                : onCheckIn(reservation.id)}
              disabled={checkingIn === reservation.id}
              className="flex items-center gap-1 bg-chart-4 text-white px-3 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50 min-h-[44px] whitespace-nowrap active:scale-[0.98] transition-all"
            >
              {checkingIn === reservation.id ? (
                <Icon icon="solar:spinner-bold" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:check-circle-bold" className="size-4" />
              )}
              {labels.checkIn}
            </button>
          )}
          {isPresent && !reservation.has_journal && onNavigateJournal && (
            <button
              onClick={() => onNavigateJournal(reservation.id)}
              className="flex items-center gap-1 bg-chart-2 text-white px-3 py-2 rounded-lg text-xs font-bold min-h-[44px] whitespace-nowrap active:scale-[0.98] transition-all"
              aria-label={`${recordLabel}を作成`}
            >
              <Icon icon="solar:clipboard-add-bold" className="size-4" />
              {recordLabel}
            </button>
          )}
          {isPresent && reservation.has_journal && onCheckOut && (
            <button
              onClick={() => onCheckOut(reservation.id)}
              disabled={checkingIn === reservation.id}
              className="flex items-center gap-1 bg-chart-3 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 min-h-[44px] whitespace-nowrap active:scale-[0.98] transition-all"
              aria-label={labels.checkOut}
            >
              {checkingIn === reservation.id ? (
                <Icon icon="solar:spinner-bold" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:logout-3-bold" className="size-4" />
              )}
              {labels.checkOut}
            </button>
          )}
          {displayStatus === '帰宅済' && (
            <div className="flex items-center gap-1 text-chart-3 px-2 py-1">
              <Icon icon="solar:check-circle-bold" className="size-5" />
              <span className="text-xs font-bold">帰宅済</span>
            </div>
          )}
        </div>

        <Icon icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
          className="size-5 text-muted-foreground shrink-0" />
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {hasPreVisitInput(reservation) && (
            <div className="bg-chart-3/5 px-4 py-3">
              <p className="text-xs font-bold text-chart-3 mb-1">
                <Icon icon="solar:clipboard-text-bold" className="size-4 mr-1" />
                飼い主さんからの連絡
              </p>
              {reservation.health_status && (
                <p className="text-xs text-foreground">{reservation.health_status}</p>
              )}
              {reservation.notes && (
                <p className="text-xs text-foreground">{reservation.notes}</p>
              )}
              {reservation.breakfast_status && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  朝ごはん: {reservation.breakfast_status}
                </p>
              )}
            </div>
          )}

          <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
              isPresent ? 'bg-chart-2/10 text-chart-2 border border-chart-2/30' :
              isWaiting ? 'bg-chart-4/10 text-chart-4 border border-chart-4/30' :
              'bg-muted text-muted-foreground border border-border'
            }`}>
              {displayStatus === '来園待ち' && (
                <Icon icon="solar:clock-circle-bold" className="size-3 mr-1" />
              )}
              {displayStatus === '在園中' && (
                <Icon icon="solar:home-smile-bold" className="size-3 mr-1" />
              )}
              {displayStatus === '帰宅済' && (
                <Icon icon="solar:check-circle-bold" className="size-3 mr-1" />
              )}
              {getReservationStatusLabel(displayStatus, businessType)}
            </span>
            {reservation.checked_in_at && (
              <span className="text-chart-2">
                {new Date(reservation.checked_in_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 到着
              </span>
            )}
          </div>

          <div className="flex border-t border-border">
            {hasPreVisitInput(reservation) && onNavigatePreVisit && (
              <>
                <button
                  onClick={() => onNavigatePreVisit(reservation.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted active:scale-[0.98] transition-all"
                >
                  <Icon icon="solar:clipboard-text-bold" className="size-4" />
                  事前入力
                </button>
                <div className="w-px bg-border" />
              </>
            )}
            <button
              onClick={() => onNavigateTraining(reservation.dog_id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted active:scale-[0.98] transition-all"
            >
              <Icon icon="solar:clipboard-list-bold" className="size-4" />
              内部記録
            </button>
            <div className="w-px bg-border" />
            <button
              onClick={() => onNavigateRecord(reservation.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted active:scale-[0.98] transition-all"
            >
              <Icon icon="solar:document-text-bold" className="size-4" />
              {recordLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default ReservationCard
