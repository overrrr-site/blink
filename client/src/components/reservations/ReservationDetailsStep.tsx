import { Icon } from '../Icon'
import { formatDateFullWithWeekday } from '../../utils/date'

type ReservationForm = {
  reservation_date: string
  reservation_time: string
  pickup_time: string
  reservation_type: 'regular' | 'single'
  notes: string
}

type ReservationDetailsStepProps = {
  form: ReservationForm
  selectedDogName: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBack: () => void
}

export default function ReservationDetailsStep({
  form,
  selectedDogName,
  onChange,
  onBack,
}: ReservationDetailsStepProps) {
  return (
    <>
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:tag-bold" className="text-chart-4 size-4" />
            予約タイプ
          </h3>
          <div className="relative group">
            <Icon icon="solar:question-circle-bold"
              className="size-4 text-muted-foreground cursor-help" />
            <div className="absolute left-0 top-6 w-64 p-3 bg-foreground text-background text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
              予約タイプによって、料金の計算方法や回数券の消化方法が異なります
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all min-h-[44px] ${
              form.reservation_type === 'regular'
                ? 'border-2 border-primary bg-primary/10 shadow-sm'
                : 'border border-border hover:bg-muted/50 hover:border-primary/30'
            }`}
          >
            <input
              type="radio"
              name="reservation_type"
              value="regular"
              checked={form.reservation_type === 'regular'}
              onChange={onChange}
              className="hidden"
            />
            <div
              className={`size-5 rounded-full border-2 flex items-center justify-center ${
                form.reservation_type === 'regular' ? 'border-primary' : 'border-border'
              }`}
            >
              {form.reservation_type === 'regular' && <div className="size-2.5 rounded-full bg-primary"></div>}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">通常予約</p>
              <p className="text-[10px] text-muted-foreground">月謝・回数券から自動消化</p>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all min-h-[44px] ${
              form.reservation_type === 'single'
                ? 'border-2 border-primary bg-primary/10 shadow-sm'
                : 'border border-border hover:bg-muted/50 hover:border-primary/30'
            }`}
          >
            <input
              type="radio"
              name="reservation_type"
              value="single"
              checked={form.reservation_type === 'single'}
              onChange={onChange}
              className="hidden"
            />
            <div
              className={`size-5 rounded-full border-2 flex items-center justify-center ${
                form.reservation_type === 'single' ? 'border-primary' : 'border-border'
              }`}
            >
              {form.reservation_type === 'single' && <div className="size-2.5 rounded-full bg-primary"></div>}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">単発予約</p>
              <p className="text-[10px] text-muted-foreground">都度払い（当日または後日決済）</p>
            </div>
            <span className="text-xs font-bold text-primary">¥6,600</span>
          </label>
        </div>
        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
          >
            戻る
          </button>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
          <Icon icon="solar:notes-bold" className="text-muted-foreground size-4" />
          備考
        </h3>
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          placeholder="スタッフへの連絡事項があれば入力"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </section>

      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
          <Icon icon="solar:check-circle-bold" className="text-chart-2 size-4" />
          予約内容の確認
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">日付</span>
            <span className="font-medium">{formatDateFullWithWeekday(form.reservation_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">登園時間</span>
            <span className="font-medium">{form.reservation_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">お迎え時間</span>
            <span className="font-medium">{form.pickup_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">犬</span>
            <span className="font-medium">{selectedDogName || '未選択'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">予約タイプ</span>
            <span className="font-medium">
              {form.reservation_type === 'regular' ? '通常予約' : '単発予約'}
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
