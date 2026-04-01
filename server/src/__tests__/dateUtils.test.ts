import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDaysToDateString,
  addMonthsToDateString,
  getDayOfWeekFromDateString,
  toCompactDateStringJST,
  toDateStringJST,
} from '../utils/date.js'

describe('server date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps JST date strings stable at the midnight boundary', () => {
    const date = new Date('2026-03-31T00:30:00+09:00')
    expect(toDateStringJST(date)).toBe('2026-03-31')
    expect(toCompactDateStringJST(date)).toBe('20260331')
  })

  it('shifts calendar date strings without timezone drift', () => {
    expect(addMonthsToDateString('2026-03-01', 1)).toBe('2026-04-01')
    expect(addDaysToDateString('2026-03-31', 1)).toBe('2026-04-01')
    expect(getDayOfWeekFromDateString('2026-03-31')).toBe(2)
  })
})
