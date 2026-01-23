import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type FormData = {
  reservation_date: string
  reservation_time: string
  pickup_time: string
  notes: string
}

type ReservationFormFieldsProps = {
  formData: FormData
  onChange: (fields: Partial<FormData>) => void
}

export default function ReservationFormFields({ formData, onChange }: ReservationFormFieldsProps) {
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
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                       focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            required
            aria-required="true"
          />
        </div>
        {formData.reservation_date && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {format(new Date(formData.reservation_date), 'yyyy年M月d日 (E)', { locale: ja })}
          </p>
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
