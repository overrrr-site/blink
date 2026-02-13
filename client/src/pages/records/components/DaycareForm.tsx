import useSWR from 'swr'
import type { DaycareData } from '@/types/record'
import { Icon } from '@/components/Icon'
import { fetcher } from '@/lib/swr'
import {
  getTrainingItems,
  hasTrainingMasterCategories,
  toggleTrainingItem,
  updateTrainingNote,
} from '../utils/daycareForm'

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

  const trainingItems = getTrainingItems(data)
  const hasTrainingMasters = hasTrainingMasterCategories(trainingMasters)

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
                          onClick={() => onChange(toggleTrainingItem(data, item.item_key, option.value))}
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
              onChange={(e) => onChange(updateTrainingNote(data, e.target.value))}
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
    </div>
  )
}
