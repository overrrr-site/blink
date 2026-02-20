import { describe, expect, it } from 'vitest'
import { formatEntryDateShort, normalizeEntryDate } from './trainingDate'

describe('trainingDate', () => {
  it('normalizes ISO date-time and date-only inputs to YYYY-MM-DD', () => {
    expect(normalizeEntryDate('2026-02-19T00:00:00.000Z')).toBe('2026-02-19')
    expect(normalizeEntryDate('2026-02-19')).toBe('2026-02-19')
  })

  it('formats normalized dates as M/D and avoids NaN output', () => {
    expect(formatEntryDateShort('2026-02-19T00:00:00.000Z')).toBe('2/19')
    expect(formatEntryDateShort('2026-02-19')).toBe('2/19')
    expect(formatEntryDateShort('')).toBe('-')
  })
})
