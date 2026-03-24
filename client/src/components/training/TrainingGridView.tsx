import { useState, useMemo, useCallback } from 'react'
import { Icon } from '../Icon'
import { trainingProfilesApi } from '../../api/trainingProfiles'
import type {
  TrainingProfileCategory,
  TrainingProfileCategoryItem,
  AchievementLevel,
  GridEntry,
} from '../../types/trainingProfile'
import {
  buildCategoryDateColumns,
  buildDisplayDates,
  buildGridCellAction,
  buildGridEntryMap,
  createAchievementCycle,
} from './trainingGridModel'
import { formatEntryDateShort } from '../../utils/trainingDate'

interface TrainingGridViewProps {
  category: TrainingProfileCategory
  achievementLevels: AchievementLevel[]
  entries: GridEntry[]
  dogId: string
  visualIndex?: number
  onMutate: () => void
  onSaved?: () => void
}

type PendingAction =
  | { type: 'upsert'; payload: { categoryId: number; trainingItemId: number; entryDate: string; achievementSymbol: string } }
  | { type: 'delete'; entryId: number }

const GRID_VISUALS = [
  {
    icon: 'solar:checklist-bold',
    borderClass: 'border-chart-2/20',
    headerClass: 'bg-gradient-to-r from-chart-2/10 via-transparent to-transparent',
    iconClass: 'bg-chart-2/15 text-chart-2',
    legendClass: 'bg-chart-2/5',
    addDateButtonClass: 'text-chart-2 hover:bg-chart-2/10',
  },
  {
    icon: 'solar:star-bold',
    borderClass: 'border-chart-4/20',
    headerClass: 'bg-gradient-to-r from-chart-4/10 via-transparent to-transparent',
    iconClass: 'bg-chart-4/15 text-chart-4',
    legendClass: 'bg-chart-4/5',
    addDateButtonClass: 'text-chart-4 hover:bg-chart-4/10',
  },
  {
    icon: 'solar:paw-print-bold',
    borderClass: 'border-chart-3/20',
    headerClass: 'bg-gradient-to-r from-chart-3/10 via-transparent to-transparent',
    iconClass: 'bg-chart-3/15 text-chart-3',
    legendClass: 'bg-chart-3/5',
    addDateButtonClass: 'text-chart-3 hover:bg-chart-3/10',
  },
] as const

function TrainingGridView({
  category,
  achievementLevels,
  entries,
  dogId,
  visualIndex = 0,
  onMutate,
  onSaved,
}: TrainingGridViewProps) {
  const [saving, setSaving] = useState(false)
  const [showAddDate, setShowAddDate] = useState(false)
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingAction>>(new Map())
  const [localOverrides, setLocalOverrides] = useState<Map<string, string>>(new Map())

  const items: TrainingProfileCategoryItem[] = category.items || []
  const categoryEntries = entries.filter((e) => e.category_id === category.id)

  const allDates = useMemo(() => buildCategoryDateColumns(categoryEntries), [categoryEntries])

  const entryMap = useMemo(() => buildGridEntryMap(categoryEntries), [categoryEntries])

  const symbolCycle = useMemo(() => createAchievementCycle(achievementLevels), [achievementLevels])
  const legendNote = '※ 上段は凡例です。記録は下のマスをタップしてください'

  const levelMap = useMemo(() => {
    const map = new Map<string, AchievementLevel>()
    achievementLevels.forEach((l) => map.set(l.symbol, l))
    return map
  }, [achievementLevels])

  const hasPendingChanges = pendingChanges.size > 0

  const handleCellTap = useCallback((
    itemId: number,
    date: string,
    currentSymbol: string,
  ) => {
    if (saving) {
      return
    }

    const cellAction = buildGridCellAction({
      categoryId: category.id,
      trainingItemId: itemId,
      entryDate: date,
      currentSymbol,
      entryMap,
      symbolCycle,
    })

    if (cellAction.type === 'none') {
      return
    }

    const key = `${itemId}_${date}`
    setPendingChanges((prev) => {
      const next = new Map(prev)
      next.set(key, cellAction)
      return next
    })

    // ローカルでUI即時反映
    const nextSymbol = cellAction.type === 'upsert' ? cellAction.payload.achievementSymbol : ''
    setLocalOverrides((prev) => {
      const next = new Map(prev)
      next.set(key, nextSymbol)
      return next
    })
  }, [saving, symbolCycle, entryMap, category.id])

  const handleSave = useCallback(async () => {
    if (pendingChanges.size === 0 || saving) {
      return
    }
    setSaving(true)
    try {
      for (const action of pendingChanges.values()) {
        if (action.type === 'delete') {
          await trainingProfilesApi.deleteGridEntry({ dogId, entryId: action.entryId })
        } else {
          await trainingProfilesApi.upsertGridEntry({
            dogId,
            categoryId: action.payload.categoryId,
            trainingItemId: action.payload.trainingItemId,
            entryDate: action.payload.entryDate,
            achievementSymbol: action.payload.achievementSymbol,
          })
        }
      }
      setPendingChanges(new Map())
      setLocalOverrides(new Map())
      onMutate()
      onSaved?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [pendingChanges, saving, dogId, onMutate, onSaved])

  const handleAddDate = useCallback(() => {
    if (!newDate) {
      return
    }

    if (!allDates.includes(newDate)) {
      if (items.length > 0) {
        setExtraDates((prev) => [...new Set([...prev, newDate])])
      }
    }

    setShowAddDate(false)
  }, [newDate, allDates, items])

  const [extraDates, setExtraDates] = useState<string[]>([])

  const displayDates = useMemo(() => buildDisplayDates(allDates, extraDates), [allDates, extraDates])
  const visual = GRID_VISUALS[Math.abs(visualIndex) % GRID_VISUALS.length]

  const headerContent = (
    <div className={`px-4 py-3 border-b border-border ${visual.headerClass}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg ${visual.iconClass}`}>
          <Icon icon={visual.icon} width="14" height="14" />
        </span>
        <div>
          <h3 className="text-sm font-bold">{category.name}</h3>
          {category.goal && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{category.goal}</p>
          )}
        </div>
      </div>
    </div>
  )

  if (items.length === 0) {
    return (
      <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${visual.borderClass}`}>
        {headerContent}
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">項目が設定されていません</p>
          <p className="text-[11px] text-muted-foreground mt-1">設定ページからトレーニング項目を追加してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${visual.borderClass}`}>
      {headerContent}

      {/* Legend */}
      <div className={`px-4 py-2 border-b border-border ${visual.legendClass}`}>
        <div className="flex flex-wrap gap-2">
          {achievementLevels.map((level) => (
            <div key={level.id} className="flex items-center gap-1">
              <CellBadge symbol={level.symbol} level={level} size="sm" />
              <span className="text-[10px] text-muted-foreground">{level.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{legendNote}</p>
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card min-w-[120px] px-3 py-2 text-left text-[11px] font-bold text-muted-foreground border-b border-border">
                <span className="inline-flex items-center gap-1">
                  <Icon icon="solar:clipboard-list-bold" width="12" height="12" className="opacity-70" />
                  項目
                </span>
              </th>
              {displayDates.map((date) => (
                <th key={date} className="min-w-[48px] px-1 py-2 text-center text-[10px] font-medium text-muted-foreground border-b border-border">
                  {formatEntryDateShort(date)}
                </th>
              ))}
              <th className="min-w-[40px] px-1 py-2 text-center border-b border-border">
                <button
                  onClick={() => setShowAddDate(true)}
                  className={`inline-flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full active:scale-95 transition-all ${visual.addDateButtonClass}`}
                >
                  <Icon icon="solar:add-circle-linear" width="16" height="16" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="sticky left-0 z-10 bg-card px-3 py-2 text-xs font-medium border-b border-border/50 whitespace-nowrap">
                  {item.item_label}
                </td>
                {displayDates.map((date) => {
                  const key = `${item.training_item_id}_${date}`
                  const existing = entryMap.get(key)
                  const rawSymbol = existing?.symbol || ''
                  const baseSymbol = levelMap.has(rawSymbol) ? rawSymbol : ''
                  const symbol = localOverrides.has(key) ? localOverrides.get(key)! : baseSymbol
                  const level = symbol ? levelMap.get(symbol) : undefined
                  const dateLabel = formatEntryDateShort(date)
                  const isPending = localOverrides.has(key)

                  return (
                    <td
                      key={date}
                      className="min-w-[48px] px-1 py-1.5 text-center border-b border-border/50"
                    >
                      <button
                        onClick={() => handleCellTap(item.training_item_id, date, symbol)}
                        className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg border transition-all active:scale-90 ${
                          symbol
                            ? `bg-background hover:bg-muted ${isPending ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/70'}`
                            : 'border-dashed border-border/70 bg-muted/30 hover:bg-muted'
                        }`}
                        disabled={saving}
                        aria-label={`${item.item_label} ${dateLabel} の達成状況を記録`}
                        title={`${item.item_label} ${dateLabel} の達成状況を記録`}
                      >
                        {symbol ? (
                          <CellBadge symbol={symbol} level={level} size="md" />
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">タップ</span>
                        )}
                      </button>
                    </td>
                  )
                })}
                <td className="border-b border-border/50" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add date dialog */}
      {showAddDate && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleAddDate}
              className="px-3 py-2 text-xs font-bold text-white bg-primary rounded-lg active:scale-[0.97] transition-all"
            >
              追加
            </button>
            <button
              onClick={() => setShowAddDate(false)}
              className="px-3 py-2 text-xs font-medium text-muted-foreground rounded-lg border border-border active:scale-[0.97] transition-all"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      {hasPendingChanges && (
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-primary rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px]"
          >
            <Icon icon={saving ? 'solar:refresh-bold' : 'solar:check-circle-bold'} width="18" height="18" className={saving ? 'animate-spin' : ''} />
            {saving ? '保存中...' : `保存する（${pendingChanges.size}件）`}
          </button>
        </div>
      )}
    </div>
  )
}

function CellBadge({
  symbol,
  level,
  size,
}: {
  symbol: string
  level?: AchievementLevel
  size: 'sm' | 'md'
}) {
  const colorClass = level?.color_class || 'bg-muted border-border text-foreground'
  const sizeClass = size === 'sm'
    ? 'text-[10px] w-5 h-5'
    : 'text-xs w-7 h-7'

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-bold ${colorClass} ${sizeClass}`}
    >
      {symbol}
    </span>
  )
}

export default TrainingGridView
