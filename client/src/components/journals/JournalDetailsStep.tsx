import { memo } from 'react'
import { Icon } from '../Icon'
import type { AchievementOption, JournalFormData, Staff, TrainingCategory } from './types'

interface JournalDetailsStepProps {
  formData: JournalFormData
  showDetails: boolean
  onToggleDetails: () => void
  onUpdateForm: (patch: Partial<JournalFormData>) => void
  onTrainingChange: (itemId: string, value: string) => void
  trainingCategories: Record<string, TrainingCategory>
  staffList: Staff[]
  achievementOptions: AchievementOption[]
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
}: JournalDetailsStepProps) {
  return (
    <div className="px-5 py-6 space-y-4">
      <div className="text-center mb-4">
        <Icon icon="solar:clipboard-check-bold" className="size-12 text-primary mb-2" />
        <h2 className="text-lg font-bold">詳細記録（任意）</h2>
        <p className="text-sm text-muted-foreground">時間があれば記録しましょう</p>
      </div>

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
