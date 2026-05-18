import { memo } from 'react'
import { Icon } from '../Icon'
import type {
  DogLifestyleData,
  RestEnvironment,
  ToiletEnvironment,
  ToiletTraining,
  PraiseWord,
  ToiletSignal,
  TreatExperience,
} from '../../types/dog'

interface DogEditLifestyleProps {
  data: DogLifestyleData
  onChange: (next: DogLifestyleData) => void
}

const REST_OPTIONS: Array<{ value: RestEnvironment; label: string }> = [
  { value: 'circle', label: 'サークル' },
  { value: 'bed_only', label: 'ベッドのみ' },
  { value: 'crate', label: 'クレート' },
  { value: 'none', label: 'なし' },
]

const TOILET_ENV_OPTIONS: Array<{ value: ToiletEnvironment; label: string }> = [
  { value: 'sheet_only', label: 'シートのみ' },
  { value: 'tray_with_mesh', label: 'メッシュありトレー' },
  { value: 'tray_no_mesh', label: 'メッシュなしトレー' },
  { value: 'outside', label: '外' },
]

const TOILET_TRAINING_OPTIONS: Array<{ value: ToiletTraining; label: string }> = [
  { value: 'voluntary', label: 'したいとき自発的に' },
  { value: 'on_command', label: '声かけ（コマンドでできる）' },
  { value: 'many_failures', label: '失敗が多い' },
]

const PRAISE_OPTIONS: Array<{ value: PraiseWord; label: string }> = [
  { value: 'iiko', label: 'いいこ' },
  { value: 'good', label: 'good' },
  { value: 'other', label: 'その他（自由記述）' },
]

const TOILET_SIGNAL_OPTIONS: Array<{ value: ToiletSignal; label: string }> = [
  { value: 'wantsu', label: 'ワンツー' },
  { value: 'toilet', label: 'トイレ' },
  { value: 'other', label: 'その他（自由記述）' },
]

const TREAT_OPTIONS: Array<{ value: TreatExperience; label: string }> = [
  { value: 'kong_paste', label: 'コングペースト' },
  { value: 'churu', label: 'チュール' },
  { value: 'k9_natural', label: 'K9ナチュラル' },
  { value: 'cheese', label: 'チーズ' },
  { value: 'other', label: 'その他（自由記述）' },
  { value: 'none', label: 'なし' },
]

function toggle<T extends string>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function CheckGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  helper,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  selected: T[]
  onToggle: (value: T) => void
  helper?: string
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              aria-pressed={isSelected}
              className={`px-3 py-2 rounded-lg text-sm font-medium border min-h-[40px] transition-all active:scale-95 ${
                isSelected
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {helper && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}
    </div>
  )
}

const DogEditLifestyle = memo(function DogEditLifestyle({ data, onChange }: DogEditLifestyleProps) {
  const update = <K extends keyof DogLifestyleData>(key: K, value: DogLifestyleData[K]) => {
    onChange({ ...data, [key]: value })
  }

  return (
    <section className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-5">
      <h3 className="text-sm font-bold font-heading flex items-center gap-2">
        <Icon icon="solar:home-2-bold" width="16" height="16" className="text-chart-3" />
        生活の様子
      </h3>

      <CheckGroup
        label="ほめ言葉の種類"
        options={PRAISE_OPTIONS}
        selected={data.praise_words}
        onToggle={(v) => update('praise_words', toggle(data.praise_words, v))}
        helper="複数選択可"
      />
      {data.praise_words.includes('other') && (
        <input
          type="text"
          value={data.praise_words_other}
          onChange={(e) => update('praise_words_other', e.target.value)}
          placeholder="その他のほめ言葉（自由記述）"
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      )}

      <CheckGroup
        label="トイレの合図"
        options={TOILET_SIGNAL_OPTIONS}
        selected={data.toilet_signal}
        onToggle={(v) => update('toilet_signal', toggle(data.toilet_signal, v))}
        helper="複数選択可"
      />
      {data.toilet_signal.includes('other') && (
        <input
          type="text"
          value={data.toilet_signal_other}
          onChange={(e) => update('toilet_signal_other', e.target.value)}
          placeholder="その他のトイレ合図（自由記述）"
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      )}

      <CheckGroup
        label="休息場所の環境"
        options={REST_OPTIONS}
        selected={data.rest_environments}
        onToggle={(v) => update('rest_environments', toggle(data.rest_environments, v))}
        helper="使用しているものをすべて選択"
      />

      <div>
        <label className="block text-xs font-bold text-foreground mb-2">排泄環境</label>
        <select
          value={data.toilet_environment}
          onChange={(e) => update('toilet_environment', e.target.value as ToiletEnvironment | '')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="">未設定</option>
          {TOILET_ENV_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <CheckGroup
        label="排泄のしつけ"
        options={TOILET_TRAINING_OPTIONS}
        selected={data.toilet_training}
        onToggle={(v) => update('toilet_training', toggle(data.toilet_training, v))}
        helper="該当項目すべて"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">排尿（回/日）</label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={data.urination_count_per_day}
            onChange={(e) => update('urination_count_per_day', e.target.value)}
            placeholder="3"
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">排便（回/日）</label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={data.defecation_count_per_day}
            onChange={(e) => update('defecation_count_per_day', e.target.value)}
            placeholder="1"
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">排泄しやすいタイミング</label>
        <input
          type="text"
          value={data.toilet_timing_notes}
          onChange={(e) => update('toilet_timing_notes', e.target.value)}
          placeholder="食後すぐ／散歩中など（自由記述）"
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer min-h-[40px]">
          <input
            type="checkbox"
            checked={data.has_lunch}
            onChange={(e) => update('has_lunch', e.target.checked)}
            className="size-5 accent-primary cursor-pointer"
          />
          <span className="text-sm font-medium">昼食あり</span>
        </label>
        {data.has_lunch && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">与える時間</label>
            <input
              type="time"
              value={data.lunch_time}
              onChange={(e) => update('lunch_time', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        )}
      </div>

      <CheckGroup
        label="おやつの使用経験"
        options={TREAT_OPTIONS}
        selected={data.treat_experience}
        onToggle={(v) => update('treat_experience', toggle(data.treat_experience, v))}
        helper="店舗で使用するおやつを中心にお伺いしています"
      />
      {data.treat_experience.includes('other') && (
        <input
          type="text"
          value={data.treat_other_notes}
          onChange={(e) => update('treat_other_notes', e.target.value)}
          placeholder="その他のおやつ（自由記述）"
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      )}
    </section>
  )
})

export default DogEditLifestyle
