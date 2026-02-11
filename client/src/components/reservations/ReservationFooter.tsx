import { Icon } from '../Icon'
import { formatDateFullWithWeekday } from '../../utils/date'

type ReservationFooterProps = {
  isSaving: boolean
  isDisabled: boolean
  summaryName?: string
  summaryOwner?: string
  reservationDate: string
  reservationTime: string
  pickupTime: string
  onSubmit: (event: React.FormEvent) => void
}

export default function ReservationFooter({
  isSaving,
  isDisabled,
  summaryName,
  summaryOwner,
  reservationDate,
  reservationTime,
  pickupTime,
  onSubmit,
}: ReservationFooterProps) {
  return (
    <div className="fixed bottom-[72px] left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4">
      {summaryName && summaryOwner && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">予約内容</p>
            <p className="text-sm font-bold">
              {summaryName}（{summaryOwner}様）/ {formatDateFullWithWeekday(reservationDate)} {reservationTime}-{pickupTime}
            </p>
          </div>
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={isSaving || isDisabled}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSaving ? (
          '登録中...'
        ) : (
          <>
            <Icon icon="solar:check-circle-bold" width="20" height="20" />
            予約を確定する
          </>
        )}
      </button>
    </div>
  )
}
