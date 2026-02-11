import { useMemo } from 'react'
import type { DaycareData } from '@/types/record'
import { Icon } from '@/components/Icon'

const ACTIVITIES = [
  { value: 'freeplay', label: 'フリープレイ', icon: 'mdi:tennis-ball' },
  { value: 'training', label: 'トレーニング', icon: 'mdi:book-open-page-variant' },
  { value: 'walk', label: 'お散歩', icon: 'mdi:walk' },
  { value: 'nap', label: 'お昼寝', icon: 'mdi:sleep' },
  { value: 'socialization', label: '社会化', icon: 'mdi:dog-side' },
] as const

const TIME_PERIODS = [
  { key: 'morning', label: '朝' },
  { key: 'afternoon', label: '午後' },
] as const

const TOILET_SLOTS = [
  { key: '08:00', label: '8:00' },
  { key: '10:00', label: '10:00' },
  { key: '12:00', label: '12:00' },
  { key: '14:00', label: '14:00' },
  { key: '16:00', label: '16:00' },
] as const

interface DaycareFormProps {
  data: DaycareData
  onChange: (data: DaycareData) => void
}

export default function DaycareForm({ data, onChange }: DaycareFormProps) {
  const toggleActivity = (value: string) => {
    const activities = data.activities || []
    const next = activities.includes(value)
      ? activities.filter((a) => a !== value)
      : [...activities, value]
    onChange({ ...data, activities: next })
  }

  const handleMealChange = (period: 'morning' | 'afternoon', value: string) => {
    onChange({
      ...data,
      meal: {
        ...data.meal,
        [period]: value,
      },
    })
  }

  const migratedToilet = useMemo(() => {
    if (!data.toilet) return data.toilet
    const result: Record<string, { urination: boolean; defecation: boolean }> = {}
    Object.entries(data.toilet).forEach(([key, val]) => {
      if (key === 'morning') result['10:00'] = val
      else if (key === 'afternoon') result['14:00'] = val
      else result[key] = val
    })
    return result
  }, [data.toilet])

  const toggleToilet = (slot: string, type: 'urination' | 'defecation') => {
    const currentData = migratedToilet?.[slot] || { urination: false, defecation: false }
    onChange({
      ...data,
      toilet: {
        ...migratedToilet,
        [slot]: {
          ...currentData,
          [type]: !currentData[type],
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* 今日の活動 */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">今日の活動</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map(({ value, label, icon }) => {
            const selected = (data.activities || []).includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleActivity(value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] min-h-[44px] flex items-center gap-2 ${
                  selected ? 'bg-primary/10 border-[1.5px] border-primary text-primary' : 'border border-border text-muted-foreground bg-white'
                }`}
                aria-pressed={selected}
              >
                <Icon icon={icon} width="18" height="18" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ごはん */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Icon icon="mdi:silverware-fork-knife" width="18" height="18" />
          ごはん
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIME_PERIODS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-muted-foreground mb-1">{label}ごはん</label>
              <input
                type="text"
                value={data.meal?.[key as 'morning' | 'afternoon'] || ''}
                onChange={(e) => handleMealChange(key as 'morning' | 'afternoon', e.target.value)}
                placeholder="例: 完食、半分残した"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* トイレ */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Icon icon="mdi:toilet" width="18" height="18" />
          トイレ
        </p>
        <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1">
          {TOILET_SLOTS.map(({ key, label }) => {
            const slotData = migratedToilet?.[key] || { urination: false, defecation: false }
            return (
              <div key={key} className="bg-muted/30 rounded-xl p-3 min-w-[100px] flex-shrink-0">
                <p className="text-xs text-muted-foreground mb-2 text-center">{label}</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toggleToilet(key, 'urination')}
                    className={`py-2.5 pl-3 rounded-lg text-sm font-medium transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-start gap-1.5 ${
                      slotData.urination ? 'bg-blue-100 border-[1.5px] border-blue-500 text-blue-500' : 'border border-border text-muted-foreground bg-white'
                    }`}
                    aria-pressed={slotData.urination}
                  >
                    <Icon icon="mdi:water" width="16" height="16" />
                    おしっこ
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleToilet(key, 'defecation')}
                    className={`py-2.5 pl-3 rounded-lg text-sm font-medium transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-start gap-1.5 ${
                      slotData.defecation ? 'bg-chart-4/10 border-[1.5px] border-chart-4 text-chart-4' : 'border border-border text-muted-foreground bg-white'
                    }`}
                    aria-pressed={slotData.defecation}
                  >
                    <Icon icon="fa-solid:poop" width="16" height="16" />
                    うんち
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
