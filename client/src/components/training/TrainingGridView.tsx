import { useState, useMemo, useCallback } from 'react'
import { Icon } from '../Icon'
import api from '../../api/client'
import type {
  TrainingProfileCategory,
  TrainingProfileCategoryItem,
  AchievementLevel,
  GridEntry,
} from '../../types/trainingProfile'

interface TrainingGridViewProps {
  category: TrainingProfileCategory
  achievementLevels: AchievementLevel[]
  entries: GridEntry[]
  dogId: string
  onMutate: () => void
}

function TrainingGridView({
  category,
  achievementLevels,
  entries,
  dogId,
  onMutate,
}: TrainingGridViewProps) {
  const [saving, setSaving] = useState(false)
  const [showAddDate, setShowAddDate] = useState(false)
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])

  const items: TrainingProfileCategoryItem[] = category.items || []
  const categoryEntries = entries.filter((e) => e.category_id === category.id)

  // Collect unique dates sorted descending, limit to recent 20
  const allDates = useMemo(() => {
    const dateSet = new Set(categoryEntries.map((e) => e.entry_date))
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a)).slice(0, 20)
  }, [categoryEntries])

  // Build lookup: `${training_item_id}_${entry_date}` → achievement_symbol
  const entryMap = useMemo(() => {
    const map = new Map<string, { symbol: string; id: number }>()
    categoryEntries.forEach((e) => {
      map.set(`${e.training_item_id}_${e.entry_date}`, {
        symbol: e.achievement_symbol,
        id: e.id,
      })
    })
    return map
  }, [categoryEntries])

  // Cycle through achievement symbols
  const symbolCycle = useMemo(() => {
    return ['', ...achievementLevels.map((l) => l.symbol)]
  }, [achievementLevels])

  const levelMap = useMemo(() => {
    const map = new Map<string, AchievementLevel>()
    achievementLevels.forEach((l) => map.set(l.symbol, l))
    return map
  }, [achievementLevels])

  const handleCellTap = useCallback(async (
    itemId: number,
    date: string,
    currentSymbol: string,
  ) => {
    if (saving) return
    const currentIdx = symbolCycle.indexOf(currentSymbol)
    const nextIdx = (currentIdx + 1) % symbolCycle.length
    const nextSymbol = symbolCycle[nextIdx]

    if (nextSymbol === '') {
      // Delete the entry
      const existing = entryMap.get(`${itemId}_${date}`)
      if (existing) {
        setSaving(true)
        try {
          await api.delete(`/training-profiles/dogs/${dogId}/grid/${existing.id}`)
          onMutate()
        } catch {
          // ignore
        } finally {
          setSaving(false)
        }
      }
    } else {
      // Upsert the entry
      setSaving(true)
      try {
        await api.put(`/training-profiles/dogs/${dogId}/grid`, {
          category_id: category.id,
          training_item_id: itemId,
          entry_date: date,
          achievement_symbol: nextSymbol,
        })
        onMutate()
      } catch {
        // ignore
      } finally {
        setSaving(false)
      }
    }
  }, [saving, symbolCycle, entryMap, dogId, category.id, onMutate])

  const handleAddDate = useCallback(() => {
    if (!newDate) return
    // Just close the dialog - next tap on any cell for this date will create the entry
    setShowAddDate(false)
    // Force re-render by adding date to entries if not present
    // We'll add a temporary date by creating a quick entry
    // Actually, we just need to show the date column. Let's use state for custom dates.
    if (!allDates.includes(newDate)) {
      // Create a placeholder by toggling the first item
      if (items.length > 0) {
        // Don't create anything, just show the column
        // Use local state to track added dates
        setExtraDates((prev) => [...new Set([...prev, newDate])])
      }
    }
    setShowAddDate(false)
  }, [newDate, allDates, items])

  const [extraDates, setExtraDates] = useState<string[]>([])

  const displayDates = useMemo(() => {
    const combined = new Set([...allDates, ...extraDates])
    return Array.from(combined).sort((a, b) => b.localeCompare(a))
  }, [allDates, extraDates])

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">{category.name}</h3>
          {category.goal && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{category.goal}</p>
          )}
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">項目が設定されていません</p>
          <p className="text-[11px] text-muted-foreground mt-1">設定ページからトレーニング項目を追加してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold">{category.name}</h3>
        {category.goal && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{category.goal}</p>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-border flex flex-wrap gap-2">
        {achievementLevels.map((level) => (
          <div key={level.id} className="flex items-center gap-1">
            <CellBadge symbol={level.symbol} level={level} size="sm" />
            <span className="text-[10px] text-muted-foreground">{level.label}</span>
          </div>
        ))}
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card min-w-[120px] px-3 py-2 text-left text-[11px] font-bold text-muted-foreground border-b border-border">
                項目
              </th>
              {displayDates.map((date) => (
                <th key={date} className="min-w-[48px] px-1 py-2 text-center text-[10px] font-medium text-muted-foreground border-b border-border">
                  {formatDateShort(date)}
                </th>
              ))}
              <th className="min-w-[40px] px-1 py-2 text-center border-b border-border">
                <button
                  onClick={() => setShowAddDate(true)}
                  className="inline-flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full text-primary hover:bg-primary/10 active:scale-95 transition-all"
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
                  const symbol = existing?.symbol || ''
                  const level = symbol ? levelMap.get(symbol) : undefined

                  return (
                    <td
                      key={date}
                      className="min-w-[48px] px-1 py-1.5 text-center border-b border-border/50"
                    >
                      <button
                        onClick={() => handleCellTap(item.training_item_id, date, symbol)}
                        className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg hover:bg-muted active:scale-90 transition-all"
                        disabled={saving}
                      >
                        {symbol ? (
                          <CellBadge symbol={symbol} level={level} size="md" />
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default TrainingGridView
