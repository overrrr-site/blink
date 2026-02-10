import { describe, expect, it } from 'vitest'
import {
  getRecordLabel,
  getEmptyStateMessage,
  getDashboardEmptyStateMessage,
} from '../domain/businessTypeConfig'

describe('businessTypeConfig', () => {
  it('returns correct record labels', () => {
    expect(getRecordLabel('daycare')).toBe('連絡帳')
    expect(getRecordLabel('grooming')).toBe('カルテ')
  })

  it('returns empty state per business type', () => {
    const daycare = getEmptyStateMessage('daycare')
    const grooming = getEmptyStateMessage('grooming')
    const all = getEmptyStateMessage(null)

    expect(daycare.title).toContain('登園')
    expect(grooming.title).toContain('予約')
    expect(all.title).toContain('予定')
  })

  it('uses business type config for dashboard empty state', () => {
    const daycare = getDashboardEmptyStateMessage('daycare')
    const hotel = getDashboardEmptyStateMessage('hotel')
    const all = getDashboardEmptyStateMessage(null)

    expect(daycare.title).toContain('登園')
    expect(hotel.title).toContain('お預かり')
    expect(all.title).toContain('予定')
  })
})
