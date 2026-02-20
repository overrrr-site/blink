import { describe, expect, it } from 'vitest'
import type { AchievementLevel, GridEntry } from '../../types/trainingProfile'
import {
  buildCategoryDateColumns,
  buildGridEntryMap,
  createAchievementCycle,
  getNextAchievementSymbol,
} from './trainingGridModel'

describe('trainingGridModel', () => {
  it('generates unique date columns sorted desc and capped at 20', () => {
    const entries: GridEntry[] = Array.from({ length: 22 }, (_, index) => {
      const day = String(index + 1).padStart(2, '0')
      return {
        id: index + 1,
        category_id: 1,
        training_item_id: 10,
        entry_date: `2026-01-${day}`,
        achievement_symbol: 'A',
      }
    })

    const duplicatedEntries: GridEntry[] = [
      ...entries,
      {
        ...entries[0],
        id: 999,
      },
    ]

    const columns = buildCategoryDateColumns(duplicatedEntries)

    expect(columns).toHaveLength(20)
    expect(columns[0]).toBe('2026-01-22')
    expect(columns[19]).toBe('2026-01-03')
  })

  it('cycles achievement symbols in order and wraps to empty', () => {
    const levels: AchievementLevel[] = [
      { id: 1, symbol: '△', label: '途中', display_order: 1 },
      { id: 2, symbol: '◯', label: '達成', display_order: 2 },
    ]

    const cycle = createAchievementCycle(levels)

    expect(cycle).toEqual(['', '△', '◯'])
    expect(getNextAchievementSymbol(cycle, '')).toBe('△')
    expect(getNextAchievementSymbol(cycle, '△')).toBe('◯')
    expect(getNextAchievementSymbol(cycle, '◯')).toBe('')
    expect(getNextAchievementSymbol(cycle, 'unknown')).toBe('')
  })

  it('normalizes ISO datetime strings when building date columns and grid map keys', () => {
    const entries: GridEntry[] = [
      {
        id: 1,
        category_id: 1,
        training_item_id: 10,
        entry_date: '2026-02-19T00:00:00.000Z',
        achievement_symbol: '○',
      },
      {
        id: 2,
        category_id: 1,
        training_item_id: 10,
        entry_date: '2026-02-19',
        achievement_symbol: '△',
      },
    ]

    const columns = buildCategoryDateColumns(entries)
    const entryMap = buildGridEntryMap(entries)

    expect(columns).toEqual(['2026-02-19'])
    expect(entryMap.get('10_2026-02-19')).toEqual({
      id: 2,
      symbol: '△',
    })
  })
})
