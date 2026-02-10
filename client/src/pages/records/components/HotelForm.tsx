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
}

export default function HotelForm({ data, onChange }: HotelFormProps) {
  const nights = data.nights || 1
  const careLogs = data.care_logs || []

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
            <label className="text-xs text-slate-500 mb-1 block">チェックイン</label>
            <input
              type="datetime-local"
              value={data.check_in || ''}
              onChange={(e) => handleFieldChange('check_in', e.target.value)}
              className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </div>
          <div className="min-w-0">
            <label className="text-xs text-slate-500 mb-1 block">チェックアウト予定</label>
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
            <label className="text-xs text-slate-500 mb-1 block">泊数</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFieldChange('nights', Math.max(1, nights - 1))}
                className="size-11 rounded-lg border border-cyan-200 bg-white flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition-colors"
              >
                <Icon icon="solar:minus-circle-bold" width="16" height="16" />
              </button>
              <span className="text-lg font-bold text-cyan-700 min-w-[32px] text-center">{nights}</span>
              <button
                type="button"
                onClick={() => handleFieldChange('nights', nights + 1)}
                className="size-11 rounded-lg border border-cyan-200 bg-white flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition-colors"
              >
                <Icon icon="solar:add-circle-bold" width="16" height="16" />
              </button>
              <span className="text-sm text-slate-500">泊</span>
            </div>
          </div>

          {data.check_out_actual && (
            <div className="w-full md:w-auto">
              <label className="text-xs text-slate-500 mb-1 block">実際のチェックアウト</label>
              <span className="text-sm font-medium text-cyan-700">
                {new Date(data.check_out_actual).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="solar:clipboard-list-bold" width="18" height="18" className="text-slate-600" />
            <span className="text-sm font-bold text-slate-700">滞在ログ</span>
          </div>
          <button
            type="button"
            onClick={handleAddCareLog}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[40px]"
          >
            <Icon icon="solar:add-circle-bold" width="14" height="14" />
            追加
          </button>
        </div>

        {careLogs.length === 0 ? (
          <p className="text-xs text-slate-500">食事・投薬・排泄・散歩の記録を追加できます。</p>
        ) : (
          <div className="space-y-3">
            {careLogs.map((log, index) => (
              <div key={`${log.at}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">記録時刻</label>
                    <input
                      type="datetime-local"
                      value={log.at || ''}
                      onChange={(e) => handleCareLogChange(index, { at: e.target.value })}
                      className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">カテゴリ</label>
                    <select
                      value={log.category}
                      onChange={(e) => handleCareLogChange(index, { category: e.target.value as HotelCareLogCategory })}
                      className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
                  <label className="text-xs text-slate-500 mb-1 block">内容</label>
                  <textarea
                    value={log.note || ''}
                    onChange={(e) => handleCareLogChange(index, { note: e.target.value })}
                    rows={2}
                    placeholder="例: 7:30に朝食を完食、投薬なし"
                    className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">担当（任意）</label>
                    <input
                      type="text"
                      value={log.staff || ''}
                      onChange={(e) => handleCareLogChange(index, { staff: e.target.value })}
                      placeholder="例: 佐藤"
                      className="w-full min-w-0 px-3 py-2 bg-white rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCareLog(index)}
                    className="mt-5 inline-flex items-center justify-center size-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
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

    </div>
  )
}
