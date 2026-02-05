import type { HealthCheckData } from '@/types/record'

const HEALTH_ITEMS: Array<{
  key: keyof Omit<HealthCheckData, 'weight'>
  label: string
  options: string[]
}> = [
  { key: 'ears', label: '耳', options: ['きれい', '汚れ', '赤み'] },
  { key: 'nails', label: '爪', options: ['普通', '長め', '伸びすぎ'] },
  { key: 'skin', label: '皮膚', options: ['良好', '赤み', '湿疹'] },
  { key: 'teeth', label: '歯', options: ['良好', '汚れ', '歯石'] },
]

interface HealthCheckFormProps {
  data: HealthCheckData | null
  onChange: (data: HealthCheckData) => void
}

export default function HealthCheckForm({ data, onChange }: HealthCheckFormProps) {
  const current = data || {}

  return (
    <div className="space-y-4">
      {/* 体重 */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">体重 (kg)</label>
        <input
          type="number"
          step="0.1"
          value={current.weight ?? ''}
          onChange={(e) => {
            const val = e.target.value ? parseFloat(e.target.value) : undefined
            onChange({ ...current, weight: val })
          }}
          placeholder="例: 5.2"
          className="w-32 px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* 健康チェック項目（2カラム） */}
      <div className="grid grid-cols-2 gap-3">
        {HEALTH_ITEMS.map(({ key, label, options }) => (
          <div key={key}>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
            <select
              value={current[key] || ''}
              onChange={(e) => onChange({ ...current, [key]: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
            >
              <option value="">未選択</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
