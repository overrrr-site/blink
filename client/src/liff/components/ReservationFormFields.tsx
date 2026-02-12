import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAvailability } from '../hooks/useAvailability'
import type { LiffReservationForm } from '../../types/reservation'
import type { RecordType } from '../../types/record'

type ReservationFormFieldsProps = {
  businessType: RecordType
  formData: LiffReservationForm
  onChange: (fields: Partial<LiffReservationForm>) => void
}

const GROOMING_DURATION_OPTIONS = [30, 60, 90, 120, 150, 180]

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time
  const total = h * 60 + m + minutes
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function calculateNights(checkInDate: string, checkOutDate?: string): number {
  if (!checkInDate || !checkOutDate) return 0
  const start = new Date(checkInDate)
  const end = new Date(checkOutDate)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ReservationFormFields({ businessType, formData, onChange }: ReservationFormFieldsProps) {
  const selectedMonth = formData.reservation_date
    ? format(new Date(formData.reservation_date), 'yyyy-MM')
    : format(new Date(), 'yyyy-MM')

  const { getAvailabilityForDate } = useAvailability(selectedMonth)
  const availability = formData.reservation_date
    ? getAvailabilityForDate(formData.reservation_date)
    : null

  const notesPlaceholder = businessType === 'grooming'
    ? 'ご要望や注意点があればご記入ください'
    : businessType === 'hotel'
      ? '宿泊時の注意点や持ち物があればご記入ください'
      : '特記事項があればご記入ください（体調など）'

  const notesDescription = businessType === 'grooming'
    ? 'カットのご希望や気になる点をスタッフにお伝えください'
    : businessType === 'hotel'
      ? '宿泊中のケアに必要な情報をスタッフにお伝えください'
      : '体調や気になることがあればスタッフにお伝えください'

  const groomingDuration = formData.duration_minutes ?? 60
  const groomingEndTime = addMinutes(formData.reservation_time || '10:00', groomingDuration)

  const nights = businessType === 'hotel'
    ? calculateNights(formData.reservation_date, formData.checkout_date)
    : 0

  return (
    <>
      <div>
        <label htmlFor="reservation_date" className="block text-sm font-bold mb-2">
          {businessType === 'hotel' ? 'チェックイン日' : '予約日'} <span className="text-destructive">*</span>
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
          {businessType === 'daycare' ? '登園時間' : businessType === 'grooming' ? '来店時間' : 'チェックイン時間'} <span className="text-destructive">*</span>
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

      {businessType === 'daycare' && (
        <div>
          <label htmlFor="pickup_time" className="block text-sm font-bold mb-2">
            降園予定時間 <span className="text-destructive">*</span>
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
      )}

      {businessType === 'grooming' && (
        <>
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-bold mb-2">
              施術時間 <span className="text-destructive">*</span>
            </label>
            <select
              id="duration_minutes"
              value={groomingDuration}
              onChange={(e) => onChange({ duration_minutes: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              required
            >
              {GROOMING_DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}分
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            終了予定: {groomingEndTime}
          </p>
        </>
      )}

      {businessType === 'hotel' && (
        <>
          <div>
            <label htmlFor="checkout_date" className="block text-sm font-bold mb-2">
              チェックアウト日 <span className="text-destructive">*</span>
            </label>
            <input
              id="checkout_date"
              type="date"
              value={formData.checkout_date || ''}
              min={formData.reservation_date || format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => onChange({ checkout_date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="checkout_time" className="block text-sm font-bold mb-2">
              チェックアウト時間 <span className="text-destructive">*</span>
            </label>
            <input
              id="checkout_time"
              type="time"
              value={formData.checkout_time || ''}
              onChange={(e) => onChange({ checkout_time: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              required
            />
          </div>
          <p className={`text-xs ${nights <= 0 ? 'text-warning' : 'text-muted-foreground'}`}>
            泊数: {nights > 0 ? `${nights}泊` : 'チェックアウト日はチェックイン日より後を選択してください'}
          </p>
        </>
      )}

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
          placeholder={notesPlaceholder}
          aria-describedby="notes-description"
        />
        <p id="notes-description" className="text-xs text-muted-foreground mt-1.5">
          {notesDescription}
        </p>
      </div>
    </>
  )
}
