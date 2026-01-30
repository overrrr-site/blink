import { memo } from 'react'
import { Icon } from '../Icon'
import type { AchievementOption, JournalFormData, MealEntry, Staff, TrainingCategory } from './types'

interface JournalDetailsStepProps {
  formData: JournalFormData
  showDetails: boolean
  onToggleDetails: () => void
  onUpdateForm: (patch: Partial<JournalFormData>) => void
  onTrainingChange: (itemId: string, value: string) => void
  trainingCategories: Record<string, TrainingCategory>
  staffList: Staff[]
  achievementOptions: AchievementOption[]
  onAddMeal: () => void
  onUpdateMeal: (index: number, field: keyof MealEntry, value: string) => void
  onRemoveMeal: (index: number) => void
  onFillFromLastRecord?: () => void
  loadingLastRecord?: boolean
}

const JournalDetailsStep = memo(function JournalDetailsStep({
  formData,
  showDetails,
  onToggleDetails,
  onUpdateForm,
  onTrainingChange,
  trainingCategories,
  staffList,
  achievementOptions,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
  onFillFromLastRecord,
  loadingLastRecord,
}: JournalDetailsStepProps) {
  return (
    <div className="px-5 py-6 space-y-4">
      <div className="text-center mb-4">
        <Icon icon="solar:clipboard-check-bold" className="size-12 text-primary mb-2" />
        <h2 className="text-lg font-bold">詳細記録（任意）</h2>
        <p className="text-sm text-muted-foreground">時間があれば記録しましょう</p>
      </div>

      {/* 前回と同じボタン */}
      {onFillFromLastRecord && (
        <button
          type="button"
          onClick={onFillFromLastRecord}
          disabled={loadingLastRecord}
          className="w-full py-3 rounded-xl border-2 border-primary/30 text-primary text-sm font-bold
                     flex items-center justify-center gap-2 active:bg-primary/5 transition-colors
                     disabled:opacity-50"
        >
          {loadingLastRecord ? (
            <>
              <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
              読み込み中...
            </>
          ) : (
            <>
              <Icon icon="solar:copy-bold" className="size-5" />
              前回と同じ
            </>
          )}
        </button>
      )}

      {/* トイレ記録（シンプル版） */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={onToggleDetails}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Icon icon="solar:box-bold" className="size-5 text-chart-1" />
            <span className="font-bold text-sm">トイレ記録</span>
          </div>
          <Icon
            icon={showDetails ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
            className="size-5 text-muted-foreground"
          />
        </button>

        {showDetails && (
          <div className="border-t border-border p-4 space-y-4">
            {/* 午前 */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">午前</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.morning_toilet_status}
                  onChange={(e) => onUpdateForm({ morning_toilet_status: e.target.value })}
                  className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                >
                  <option value="">未選択</option>
                  <option value="成功">成功</option>
                  <option value="失敗">失敗</option>
                </select>
                <select
                  value={formData.morning_toilet_location}
                  onChange={(e) => onUpdateForm({ morning_toilet_location: e.target.value })}
                  className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                  disabled={!formData.morning_toilet_status}
                >
                  <option value="">場所を選択</option>
                  <option value="散歩中">散歩中</option>
                  <option value="自ら指定の場所">自ら指定の場所</option>
                  <option value="誘導して指定の場所">誘導して指定の場所</option>
                </select>
              </div>
            </div>

            {/* 午後 */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">午後</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.afternoon_toilet_status}
                  onChange={(e) => onUpdateForm({ afternoon_toilet_status: e.target.value })}
                  className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                >
                  <option value="">未選択</option>
                  <option value="成功">成功</option>
                  <option value="失敗">失敗</option>
                </select>
                <select
                  value={formData.afternoon_toilet_location}
                  onChange={(e) => onUpdateForm({ afternoon_toilet_location: e.target.value })}
                  className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                  disabled={!formData.afternoon_toilet_status}
                >
                  <option value="">場所を選択</option>
                  <option value="散歩中">散歩中</option>
                  <option value="自ら指定の場所">自ら指定の場所</option>
                  <option value="誘導して指定の場所">誘導して指定の場所</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ごはん記録 */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon icon="solar:bowl-bold" className="size-5 text-chart-2" />
          <span className="font-bold text-sm">ごはん記録</span>
        </div>

        {formData.meal_data.map((entry, index) => (
          <div key={index} className="bg-muted/50 rounded-lg p-3 mb-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">ごはん {index + 1}</span>
              <button
                type="button"
                onClick={() => onRemoveMeal(index)}
                className="text-destructive text-xs font-medium min-h-[32px] px-2"
              >
                削除
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="いつ"
                value={entry.time}
                onChange={(e) => onUpdateMeal(index, 'time', e.target.value)}
                className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
              />
              <input
                type="text"
                placeholder="フード名"
                value={entry.food_name}
                onChange={(e) => onUpdateMeal(index, 'food_name', e.target.value)}
                className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
              />
              <input
                type="text"
                placeholder="量"
                value={entry.amount}
                onChange={(e) => onUpdateMeal(index, 'amount', e.target.value)}
                className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddMeal}
          className="w-full py-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"
        >
          <Icon icon="solar:add-circle-linear" className="size-4" />
          追加
        </button>
      </div>

      {/* トレーニング記録（設定から取得） */}
      {Object.entries(trainingCategories).map(([categoryKey, category]) => (
        <div key={categoryKey} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon icon={category.icon} className="size-5 text-primary" />
            <span className="font-bold text-sm">{category.label}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {category.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-xs">{item.label}</span>
                <div className="flex gap-1">
                  {achievementOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onTrainingChange(item.id, option.value)}
                      className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        formData.training_data[item.id] === option.value
                          ? option.color + ' ring-2 ring-primary'
                          : 'text-muted-foreground/30 hover:bg-muted active:bg-muted'
                      }`}
                      aria-label={`${item.label}を${option.label}に設定`}
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

      {/* 担当スタッフ */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon icon="solar:user-bold" className="size-5 text-primary" />
          <span className="font-bold text-sm">担当スタッフ</span>
        </div>
        <select
          value={formData.staff_id}
          onChange={(e) => onUpdateForm({ staff_id: e.target.value })}
          className="w-full bg-muted border-0 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">選択してください</option>
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
})

export default JournalDetailsStep
