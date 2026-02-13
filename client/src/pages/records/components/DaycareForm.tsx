import { useMemo } from 'react'
import useSWR from 'swr'
import type { DaycareData } from '@/types/record'
import { Icon } from '@/components/Icon'
import { fetcher } from '@/lib/swr'

// ---------------------------------------------------------------------------
// Training master types & category config
// ---------------------------------------------------------------------------

interface TrainingMasterItem {
  id: number
  item_key: string
  item_label: string
  category: string
  display_order: number
}

const CATEGORY_ICONS: Record<string, string> = {
  '基本トレーニング': 'mdi:book-open-page-variant',
  'トイレトレーニング': 'mdi:toilet',
  '社会化トレーニング': 'mdi:dog-side',
  '問題行動対策': 'mdi:shield-alert-outline',
}

const ACHIEVEMENT_OPTIONS = [
  { value: 'done', label: '○', activeClass: 'bg-green-100 border-[1.5px] border-green-500 text-green-600' },
  { value: 'almost', label: '△', activeClass: 'bg-yellow-100 border-[1.5px] border-yellow-500 text-yellow-600' },
  { value: 'not_done', label: '−', activeClass: 'bg-muted border-[1.5px] border-muted-foreground/40 text-muted-foreground' },
] as const

// ---------------------------------------------------------------------------
// Meal & toilet constants (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DaycareFormProps {
  data: DaycareData
  onChange: (data: DaycareData) => void
  storeId: number
}

export default function DaycareForm({ data, onChange, storeId }: DaycareFormProps) {
  // Fetch training masters from API
  const { data: trainingMasters } = useSWR<Record<string, TrainingMasterItem[]>>(
    storeId ? '/training-masters' : null,
    fetcher,
  )

  const trainingItems = data.training?.items || {}

  const handleTrainingChange = (itemKey: string, value: string) => {
    const currentValue = trainingItems[itemKey]
    const newValue = currentValue === value ? '' : value
    onChange({
      ...data,
      training: {
        ...data.training,
        items: { ...trainingItems, [itemKey]: newValue },
      },
    })
  }

  const handleTrainingNoteChange = (note: string) => {
    onChange({
      ...data,
      training: {
        ...data.training,
        items: trainingItems,
        note,
      },
    })
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

  const hasTrainingMasters = trainingMasters && Object.keys(trainingMasters).length > 0

  return (
    <div className="space-y-6">
      {/* トレーニング記録 */}
      {hasTrainingMasters && (
        <div className="space-y-4">
          {Object.entries(trainingMasters).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Icon icon={CATEGORY_ICONS[category] || 'mdi:list-box-outline'} width="18" height="18" />
                {category}
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {items.map((item) => (
                  <div
                    key={item.item_key}
                    className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2"
                  >
                    <span className="text-sm">{item.item_label}</span>
                    <div className="flex gap-1">
                      {ACHIEVEMENT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleTrainingChange(item.item_key, option.value)}
                          className={`size-10 rounded-full flex items-center justify-center text-sm font-bold active:scale-95 transition-all ${
                            trainingItems[item.item_key] === option.value
                              ? option.activeClass
                              : 'text-muted-foreground/30 hover:bg-muted active:bg-muted border border-transparent'
                          }`}
                          aria-label={`${item.item_label}を${option.label}に設定`}
                          aria-pressed={trainingItems[item.item_key] === option.value}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* トレーニングメモ */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">トレーニングメモ</label>
            <textarea
              value={data.training?.note || ''}
              onChange={(e) => handleTrainingNoteChange(e.target.value)}
              placeholder="例: 今日は集中力が高く、おすわりの成功率が上がった"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
        </div>
      )}

      {!hasTrainingMasters && (
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            トレーニング項目が設定されていません。
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            設定 → トレーニング項目 から追加してください。
          </p>
        </div>
      )}

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
