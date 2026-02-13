import { useMemo } from 'react'
import type { DaycareData } from '@/types/record'
import { Icon } from '@/components/Icon'
import {
  getToiletSlotState,
  migrateLegacyToiletSlots,
  toggleToiletBySlot,
  updateMealByPeriod,
} from '../utils/daycareForm'

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

interface DaycareCareFormProps {
  data: DaycareData
  onChange: (data: DaycareData) => void
}

export default function DaycareCareForm({ data, onChange }: DaycareCareFormProps) {
  const migratedToilet = useMemo(() => migrateLegacyToiletSlots(data.toilet), [data.toilet])

  return (
    <div className="space-y-6">
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
                onChange={(e) => onChange(updateMealByPeriod(data, key as 'morning' | 'afternoon', e.target.value))}
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
            const slotData = getToiletSlotState(migratedToilet, key)
            return (
              <div key={key} className="bg-muted/30 rounded-xl p-3 min-w-[100px] flex-shrink-0">
                <p className="text-xs text-muted-foreground mb-2 text-center">{label}</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(toggleToiletBySlot(data, migratedToilet, key, 'urination'))}
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
                    onClick={() => onChange(toggleToiletBySlot(data, migratedToilet, key, 'defecation'))}
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
