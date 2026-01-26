import { useState } from 'react'

type ReservationForm = {
  reservation_date: string
  reservation_time: string
  pickup_time: string
}

type DateTimeStepProps = {
  form: ReservationForm
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onNext: () => void
}

export default function DateTimeStep({ form, onChange, onNext }: DateTimeStepProps) {
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!form.reservation_date || !form.reservation_time) {
      setError('日付と時間を選択してください')
      return
    }
    setError('')
    onNext()
  }

  return (
    <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2">
          <iconify-icon icon="solar:calendar-bold" class="text-primary size-4"></iconify-icon>
          予約日時
        </h3>
        <div className="relative group">
          <iconify-icon
            icon="solar:question-circle-bold"
            class="size-4 text-muted-foreground cursor-help"
          ></iconify-icon>
          <div className="absolute left-0 top-6 w-64 p-3 bg-foreground text-background text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
            予約日時を選択してください。受入可能頭数を超える場合は予約できません。
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">日付</label>
          <input
            type="date"
            name="reservation_date"
            value={form.reservation_date}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">登園時間</label>
            <select
              name="reservation_time"
              value={form.reservation_time}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="08:00">08:00</option>
              <option value="08:30">08:30</option>
              <option value="09:00">09:00</option>
              <option value="09:30">09:30</option>
              <option value="10:00">10:00</option>
              <option value="10:30">10:30</option>
              <option value="11:00">11:00</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">お迎え時間</label>
            <select
              name="pickup_time"
              value={form.pickup_time}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="15:00">15:00</option>
              <option value="15:30">15:30</option>
              <option value="16:00">16:00</option>
              <option value="16:30">16:30</option>
              <option value="17:00">17:00</option>
              <option value="17:30">17:30</option>
              <option value="18:00">18:00</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
          <iconify-icon icon="solar:danger-triangle-bold" className="size-5 shrink-0"></iconify-icon>
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors min-h-[48px]"
        >
          次へ
        </button>
      </div>
    </section>
  )
}
