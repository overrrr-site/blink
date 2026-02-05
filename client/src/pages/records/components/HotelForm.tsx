import { Icon } from '@/components/Icon'
import type { HotelData } from '@/types/record'

const HOTEL_COLOR = '#06B6D4'

interface HotelFormProps {
  data: HotelData
  onChange: (data: HotelData) => void
}

export default function HotelForm({ data, onChange }: HotelFormProps) {
  const nights = data.nights || 1

  const handleFieldChange = <K extends keyof HotelData>(key: K, value: HotelData[K]) => {
    onChange({ ...data, [key]: value })
  }

  const handleDailyNote = (date: string, value: string) => {
    onChange({
      ...data,
      daily_notes: { ...(data.daily_notes || {}), [date]: value },
    })
  }

  // Generate date list for daily notes
  const getDates = (): string[] => {
    if (!data.check_in) return []
    const dates: string[] = []
    const start = new Date(data.check_in)
    for (let i = 0; i < nights; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}（${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}）`
  }

  const dates = getDates()

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">チェックイン</label>
            <input
              type="datetime-local"
              value={data.check_in || ''}
              onChange={(e) => handleFieldChange('check_in', e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">チェックアウト予定</label>
            <input
              type="datetime-local"
              value={data.check_out_scheduled || ''}
              onChange={(e) => handleFieldChange('check_out_scheduled', e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">泊数</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFieldChange('nights', Math.max(1, nights - 1))}
                className="size-8 rounded-lg border border-cyan-200 bg-white flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition-colors"
              >
                <Icon icon="solar:minus-circle-bold" width="16" height="16" />
              </button>
              <span className="text-lg font-bold text-cyan-700 min-w-[32px] text-center">{nights}</span>
              <button
                type="button"
                onClick={() => handleFieldChange('nights', nights + 1)}
                className="size-8 rounded-lg border border-cyan-200 bg-white flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition-colors"
              >
                <Icon icon="solar:add-circle-bold" width="16" height="16" />
              </button>
              <span className="text-sm text-slate-500">泊</span>
            </div>
          </div>

          {data.check_out_actual && (
            <div className="ml-auto">
              <label className="text-xs text-slate-500 mb-1 block">実際のチェックアウト</label>
              <span className="text-sm font-medium text-cyan-700">
                {new Date(data.check_out_actual).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Special Care */}
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">特別ケア・注意事項</label>
        <textarea
          value={data.special_care || ''}
          onChange={(e) => handleFieldChange('special_care', e.target.value)}
          placeholder="食事の好み、服薬情報、苦手なことなど"
          rows={3}
          className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-none"
        />
      </div>

      {/* Daily Notes */}
      {dates.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">デイリーノート</p>
          <div className="space-y-2">
            {dates.map((date, index) => (
              <div key={date}>
                <label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <span
                    className="inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: HOTEL_COLOR }}
                  >
                    {index + 1}
                  </span>
                  {formatDate(date)}
                </label>
                <textarea
                  value={data.daily_notes?.[date] || ''}
                  onChange={(e) => handleDailyNote(date, e.target.value)}
                  placeholder="この日の様子を記録..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
