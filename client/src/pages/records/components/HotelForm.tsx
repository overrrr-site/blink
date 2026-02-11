import { Icon } from '@/components/Icon'
import type { HotelCareLogCategory, HotelData } from '@/types/record'

const HOTEL_COLOR = '#06B6D4'
const CARE_LOG_OPTIONS: Array<{ value: HotelCareLogCategory; label: string }> = [
  { value: 'feeding', label: '食事' },
  { value: 'medication', label: '投薬' },
  { value: 'toilet', label: '排泄' },
  { value: 'walk', label: '散歩' },
]

function toDatetimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

interface HotelFormProps {
  data: HotelData
  onChange: (data: HotelData) => void
  mode?: 'full' | 'stay' | 'careLogs'
}

export default function HotelForm({ data, onChange, mode = 'full' }: HotelFormProps) {
  const nights = data.nights || 1
  const careLogs = data.care_logs || []
  const showStay = mode === 'full' || mode === 'stay'
  const showCareLogs = mode === 'full' || mode === 'careLogs'

  const handleFieldChange = <K extends keyof HotelData>(key: K, value: HotelData[K]) => {
    onChange({ ...data, [key]: value })
  }

  const handleAddCareLog = () => {
    onChange({
      ...data,
      care_logs: [
        ...careLogs,
        {
          at: toDatetimeLocal(new Date()),
          category: 'feeding',
          note: '',
          staff: '',
        },
      ],
    })
  }

  const handleCareLogChange = (index: number, patch: Partial<(typeof careLogs)[number]>) => {
    const nextLogs = careLogs.map((log, i) => (
      i === index ? { ...log, ...patch } : log
    ))
    onChange({
      ...data,
      care_logs: nextLogs,
    })
  }

  const handleRemoveCareLog = (index: number) => {
    onChange({
      ...data,
      care_logs: careLogs.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-4">
      {/* Check-in / Check-out */}
      {showStay && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: '#ECFEFF', border: `1px solid ${HOTEL_COLOR}33` }}
        >
          <div className="flex items-center gap-2">
            <Icon icon="solar:moon-bold" width="18" height="18" className="text-cyan-600" />
            <span className="text-sm font-bold text-cyan-700">宿泊情報</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label className="text-xs text-muted-foreground mb-1 block">チェックイン</label>
              <input
                type="datetime-local"
                value={data.check_in || ''}
                onChange={(e) => handleFieldChange('check_in', e.target.value)}
                className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-muted-foreground mb-1 block">チェックアウト予定</label>
              <input
                type="datetime-local"
                value={data.check_out_scheduled || ''}
                onChange={(e) => handleFieldChange('check_out_scheduled', e.target.value)}
                className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">泊数</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFieldChange('nights', Math.max(1, nights - 1))}
                  className="size-11 rounded-lg border border-cyan-200 bg-white flex items-center justify-center text-cyan-600 hover:bg-cyan-50 active:scale-95 transition-all"
                >
                  <Icon icon="solar:minus-circle-bold" width="16" height="16" />
                </button>
                <span className="text-lg font-bold text-cyan-700 min-w-[32px] text-center">{nights}</span>
                <button
                  type="button"
                  onClick={() => handleFieldChange('nights', nights + 1)}
                  className="size-11 rounded-lg border border-cyan-200 bg-white flex items-center justify-center text-cyan-600 hover:bg-cyan-50 active:scale-95 transition-all"
                >
                  <Icon icon="solar:add-circle-bold" width="16" height="16" />
                </button>
                <span className="text-sm text-muted-foreground">泊</span>
              </div>
            </div>

            {data.check_out_actual && (
              <div className="w-full md:w-auto">
                <label className="text-xs text-muted-foreground mb-1 block">実際のチェックアウト</label>
                <span className="text-sm font-medium text-cyan-700">
                  {new Date(data.check_out_actual).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {showCareLogs && (
        <div
          className="rounded-xl p-4 space-y-3 bg-background border border-border"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="solar:clipboard-list-bold" width="18" height="18" className="text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">滞在ログ</span>
            </div>
            <button
              type="button"
              onClick={handleAddCareLog}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-border text-xs font-bold text-foreground hover:bg-background active:scale-[0.98] transition-all min-h-[48px]"
            >
              <Icon icon="solar:add-circle-bold" width="14" height="14" />
              追加
            </button>
          </div>

          {careLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">食事・投薬・排泄・散歩の記録を追加できます。</p>
          ) : (
            <div className="space-y-3">
              {careLogs.map((log, index) => (
                <div key={`${log.at}-${index}`} className="rounded-xl border border-border bg-white p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">記録時刻</label>
                      <input
                        type="datetime-local"
                        value={log.at || ''}
                        onChange={(e) => handleCareLogChange(index, { at: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-border"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">カテゴリ</label>
                      <select
                        value={log.category}
                        onChange={(e) => handleCareLogChange(index, { category: e.target.value as HotelCareLogCategory })}
                        className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-border"
                      >
                        {CARE_LOG_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">内容</label>
                    <textarea
                      value={log.note || ''}
                      onChange={(e) => handleCareLogChange(index, { note: e.target.value })}
                      rows={2}
                      placeholder="例: 7:30に朝食を完食、投薬なし"
                      className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-border resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">担当（任意）</label>
                      <input
                        type="text"
                        value={log.staff || ''}
                        onChange={(e) => handleCareLogChange(index, { staff: e.target.value })}
                        placeholder="例: 佐藤"
                        className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-border focus:outline-none focus:ring-2 focus:ring-border"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCareLog(index)}
                      className="mt-5 inline-flex items-center justify-center size-10 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                      aria-label="滞在ログを削除"
                    >
                      <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
