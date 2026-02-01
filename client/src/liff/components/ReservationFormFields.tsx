import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAvailability } from '../hooks/useAvailability'
import type { LiffReservationForm } from '../../types/reservation'

type ReservationFormFieldsProps = {
  formData: LiffReservationForm
  onChange: (fields: Partial<LiffReservationForm>) => void
}

export default function ReservationFormFields({ formData, onChange }: ReservationFormFieldsProps) {
  // 選択された日付の月を取得
  const selectedMonth = formData.reservation_date
    ? format(new Date(formData.reservation_date), 'yyyy-MM')
    : format(new Date(), 'yyyy-MM')

  const { getAvailabilityForDate } = useAvailability(selectedMonth)
  const availability = formData.reservation_date
    ? getAvailabilityForDate(formData.reservation_date)
    : null

  return (
    <>
      <div>
        <label htmlFor="reservation_date" className="block text-sm font-bold mb-2">
          予約日 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            id="reservation_date"
            type="date"
            value={formData.reservation_date}
            onChange={(e) => onChange({ reservation_date: e.target.value })}
            min={format(new Date(), 'yyyy-MM-dd')}
            className={`w-full px-4 py-3 rounded-xl border bg-input text-foreground min-h-[52px]
                       focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all
                       ${availability?.isClosed ? 'border-destructive/50 bg-destructive/5' : ''}
                       ${availability && availability.available === 0 ? 'border-warning/50 bg-warning/5' : 'border-border'}`}
            required
            aria-required="true"
          />
        </div>
        {formData.reservation_date && (
          <div className="mt-1.5 space-y-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(formData.reservation_date), 'yyyy年M月d日 (E)', { locale: ja })}
            </p>
            {availability && (
              <div className="text-xs">
                {availability.isClosed ? (
                  <span className="text-destructive font-medium">定休日</span>
                ) : availability.available === 0 ? (
                  <span className="text-warning font-medium">満員</span>
                ) : (
                  <span className="text-primary font-medium">
                    残り {availability.available}/{availability.capacity} 枠
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="reservation_time" className="block text-sm font-bold mb-2">
          登園時間 <span className="text-destructive">*</span>
        </label>
        <input
          id="reservation_time"
          type="time"
          value={formData.reservation_time}
          onChange={(e) => onChange({ reservation_time: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="pickup_time" className="block text-sm font-bold mb-2">
          お迎え時間 <span className="text-destructive">*</span>
        </label>
        <input
          id="pickup_time"
          type="time"
          value={formData.pickup_time}
          onChange={(e) => onChange({ pickup_time: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-bold mb-2">
          備考 <span className="text-muted-foreground font-normal">(任意)</span>
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="特記事項があればご記入ください（体調など）"
          aria-describedby="notes-description"
        />
        <p id="notes-description" className="text-xs text-muted-foreground mt-1.5">
          体調や気になることがあればスタッフにお伝えください
        </p>
      </div>
    </>
  )
}
