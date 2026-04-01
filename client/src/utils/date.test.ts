import { describe, expect, it } from 'vitest'
import { formatDateISO } from './date'

describe('date utils', () => {
  it('keeps JST dates at the midnight boundary', () => {
    expect(formatDateISO(new Date('2026-03-31T00:30:00+09:00'))).toBe('2026-03-31')
  })
})
