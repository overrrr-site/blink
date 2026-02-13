import type { AchievementLevel, GridEntry } from '../../types/trainingProfile'

type GridEntryMapValue = {
  id: number
  symbol: string
}

type BuildGridCellActionParams = {
  categoryId: number
  trainingItemId: number
  entryDate: string
  currentSymbol: string
  entryMap: Map<string, GridEntryMapValue>
  symbolCycle: string[]
}

export type GridCellAction =
  | {
      type: 'none'
    }
  | {
      type: 'delete'
      entryId: number
    }
  | {
      type: 'upsert'
      payload: {
        categoryId: number
        trainingItemId: number
        entryDate: string
        achievementSymbol: string
      }
    }

export function buildCategoryDateColumns(entries: GridEntry[], maxDates = 20): string[] {
  const dateSet = new Set(entries.map((entry) => entry.entry_date))
  return Array.from(dateSet).sort((a, b) => b.localeCompare(a)).slice(0, maxDates)
}

export function buildDisplayDates(allDates: string[], extraDates: string[]): string[] {
  const combined = new Set([...allDates, ...extraDates])
  return Array.from(combined).sort((a, b) => b.localeCompare(a))
}

export function buildGridEntryMap(entries: GridEntry[]): Map<string, GridEntryMapValue> {
  const entryMap = new Map<string, GridEntryMapValue>()

  entries.forEach((entry) => {
    entryMap.set(`${entry.training_item_id}_${entry.entry_date}`, {
      id: entry.id,
      symbol: entry.achievement_symbol,
    })
  })

  return entryMap
}

export function createAchievementCycle(levels: AchievementLevel[]): string[] {
  return ['', ...levels.map((level) => level.symbol)]
}

export function getNextAchievementSymbol(symbolCycle: string[], currentSymbol: string): string {
  if (symbolCycle.length === 0) {
    return ''
  }

  const currentIndex = symbolCycle.indexOf(currentSymbol)
  const nextIndex = (currentIndex + 1) % symbolCycle.length
  return symbolCycle[nextIndex] ?? ''
}

export function buildGridCellAction({
  categoryId,
  trainingItemId,
  entryDate,
  currentSymbol,
  entryMap,
  symbolCycle,
}: BuildGridCellActionParams): GridCellAction {
  const nextSymbol = getNextAchievementSymbol(symbolCycle, currentSymbol)

  if (nextSymbol === '') {
    const existingEntry = entryMap.get(`${trainingItemId}_${entryDate}`)

    if (!existingEntry) {
      return { type: 'none' }
    }

    return {
      type: 'delete',
      entryId: existingEntry.id,
    }
  }

  return {
    type: 'upsert',
    payload: {
      categoryId,
      trainingItemId,
      entryDate,
      achievementSymbol: nextSymbol,
    },
  }
}
