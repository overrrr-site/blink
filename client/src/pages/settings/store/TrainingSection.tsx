import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import axios from 'axios'
import { Icon } from '../../../components/Icon'
import { useToast } from '../../../components/Toast'
import { useConfirmDialog } from '../../../hooks/useConfirmDialog'
import ConfirmDialog from '../../../components/ConfirmDialog'
import api from '../../../api/client'
import { fetcher } from '../../../lib/swr'
import { shallowEqualRecord } from './helpers'

interface StoreSettings {
  training_evaluation_mode?: 'three_step' | 'six_step'
}

interface TrainingItem {
  id: number
  item_label: string
  display_order: number
}

type TrainingMasters = Record<string, TrainingItem[]>

interface TrainingSectionProps {
  isDaycareEnabled: boolean
}

export default function TrainingSection({ isDaycareEnabled }: TrainingSectionProps): JSX.Element | null {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()

  const [trainingEvaluationMode, setTrainingEvaluationMode] = useState<'three_step' | 'six_step'>('three_step')
  const [reorderCategory, setReorderCategory] = useState<string | null>(null)
  const previousSettingsRef = useRef<Record<'training_evaluation_mode', 'three_step' | 'six_step'>>({
    training_evaluation_mode: 'three_step',
  })

  const { data: storeSettingsData } = useSWR<StoreSettings>(isDaycareEnabled ? '/store-settings' : null, fetcher)
  const {
    data: trainingMasters,
    isLoading,
    mutate,
  } = useSWR<TrainingMasters>(isDaycareEnabled ? '/training-masters' : null, fetcher)

  useEffect(() => {
    if (!storeSettingsData) return
    const nextMode = storeSettingsData.training_evaluation_mode ?? 'three_step'
    setTrainingEvaluationMode(nextMode)
    previousSettingsRef.current = { training_evaluation_mode: nextMode }
  }, [storeSettingsData])

  const settingsPayload = useMemo(() => ({
    training_evaluation_mode: trainingEvaluationMode,
  }), [trainingEvaluationMode])

  useEffect(() => {
    if (!storeSettingsData) return
    if (shallowEqualRecord(settingsPayload, previousSettingsRef.current)) return

    const timer = setTimeout(async () => {
      try {
        await api.put('/store-settings', settingsPayload)
        previousSettingsRef.current = settingsPayload
      } catch (error: unknown) {
        const message = axios.isAxiosError(error)
          ? (error.response?.data as { error?: string } | undefined)?.error
          : null
        showToast(message || '設定の保存に失敗しました', 'error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [settingsPayload, showToast, storeSettingsData])

  async function handleDeleteTrainingItem(id: number, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    const ok = await confirm({
      title: '削除確認',
      message: 'このトレーニング項目を削除しますか？',
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await api.delete(`/training-masters/${id}`)
      await mutate()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || 'トレーニング項目の削除に失敗しました', 'error')
    }
  }

  async function handleReorderTrainingItem(
    category: string,
    itemId: number,
    direction: 'up' | 'down',
    e: React.MouseEvent
  ): Promise<void> {
    e.stopPropagation()

    const items = trainingMasters?.[category]
    if (!items) return

    const currentIndex = items.findIndex((item) => item.id === itemId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const currentItem = items[currentIndex]
    const targetItem = items[newIndex]

    try {
      await Promise.all([
        api.put(`/training-masters/${currentItem.id}`, { display_order: targetItem.display_order }),
        api.put(`/training-masters/${targetItem.id}`, { display_order: currentItem.display_order }),
      ])
      await mutate()
    } catch {
      showToast('トレーニング項目の並び替えに失敗しました', 'error')
    }
  }

  if (!isDaycareEnabled) {
    return null
  }

  const resolvedTrainingMasters = trainingMasters ?? {}

  return (
    <>
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:checklist-bold" width="16" height="16" className="text-chart-2" />
            トレーニング項目
          </h2>
          <button
            onClick={() => navigate('/settings/training/new')}
            className="text-xs font-bold text-primary flex items-center gap-1 transition-all active:scale-[0.98]"
          >
            <Icon icon="solar:add-circle-bold" width="14" height="14" />
            追加
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">評価方式</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {trainingEvaluationMode === 'six_step'
                  ? 'コマンド項目を A〜F の6段階で評価'
                  : '全項目を ○△× の3段階で評価'}
              </p>
            </div>
            <select
              value={trainingEvaluationMode}
              onChange={(e) => setTrainingEvaluationMode(e.target.value as 'three_step' | 'six_step')}
              className="rounded-lg border border-border bg-input px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="three_step">○△×（3段階）</option>
              <option value="six_step">A〜F（6段階）</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        ) : Object.keys(resolvedTrainingMasters).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon icon="solar:checklist-bold" width="48" height="48" className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">トレーニング項目が登録されていません</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(resolvedTrainingMasters).map(([category, items]) => (
              <div key={category} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold">{category}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{items.length}項目</span>
                    <button
                      onClick={() => setReorderCategory(reorderCategory === category ? null : category)}
                      className={`text-[10px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all active:scale-[0.98] ${
                        reorderCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon icon="solar:sort-vertical-bold" width="12" height="12" />
                      {reorderCategory === category ? '完了' : '並替'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg group ${
                        reorderCategory === category
                          ? 'bg-primary/5 border-l-2 border-primary'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground flex-1">{item.item_label}</span>
                      <div className="flex items-center gap-1">
                        {reorderCategory === category ? (
                          <>
                            <button
                              onClick={(e) => handleReorderTrainingItem(category, item.id, 'up', e)}
                              disabled={index === 0}
                              className="p-2 text-muted-foreground rounded hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed min-w-[48px] min-h-[48px] flex items-center justify-center"
                              aria-label={`${item.item_label}を上に移動`}
                            >
                              <Icon icon="solar:alt-arrow-up-linear" width="16" height="16" />
                            </button>
                            <button
                              onClick={(e) => handleReorderTrainingItem(category, item.id, 'down', e)}
                              disabled={index === items.length - 1}
                              className="p-2 text-muted-foreground rounded hover:bg-muted transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed min-w-[48px] min-h-[48px] flex items-center justify-center"
                              aria-label={`${item.item_label}を下に移動`}
                            >
                              <Icon icon="solar:alt-arrow-down-linear" width="16" height="16" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`/settings/training/${item.id}`)}
                              className="p-2 text-muted-foreground rounded hover:bg-muted transition-all active:scale-90 min-w-[48px] min-h-[48px] flex items-center justify-center"
                              aria-label={`${item.item_label}を編集`}
                            >
                              <Icon icon="solar:pen-bold" width="16" height="16" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteTrainingItem(item.id, e)}
                              className="p-2 text-destructive rounded hover:bg-destructive/10 transition-all active:scale-90 min-w-[48px] min-h-[48px] flex items-center justify-center"
                              aria-label={`${item.item_label}を削除`}
                            >
                              <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  )
}
