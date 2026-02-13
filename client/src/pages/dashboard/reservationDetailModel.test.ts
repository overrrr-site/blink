import { describe, expect, it } from 'vitest'
import {
  getServiceTypeRenderFlags,
  hasReservationPreVisitInput,
  normalizeReservationServiceType,
} from './reservationDetailModel'

describe('reservationDetail model', () => {
  it('normalizes missing service type to daycare', () => {
    expect(normalizeReservationServiceType(undefined)).toBe('daycare')
    expect(normalizeReservationServiceType(null)).toBe('daycare')
    expect(normalizeReservationServiceType('hotel')).toBe('hotel')
  })

  it('returns render flags per service type', () => {
    expect(getServiceTypeRenderFlags('daycare')).toEqual({
      showDaycare: true,
      showGrooming: false,
      showHotel: false,
    })
    expect(getServiceTypeRenderFlags('grooming')).toEqual({
      showDaycare: false,
      showGrooming: true,
      showHotel: false,
    })
    expect(getServiceTypeRenderFlags('hotel')).toEqual({
      showDaycare: false,
      showGrooming: false,
      showHotel: true,
    })
  })

  it('matches existing pre-visit input decision for textual data', () => {
    expect(hasReservationPreVisitInput({})).toBe(false)
    expect(hasReservationPreVisitInput({ pre_visit_notes: '連絡あり' })).toBe(true)
  })

  it('treats explicit boolean answers as pre-visit input even when false', () => {
    expect(hasReservationPreVisitInput({ morning_urination: false })).toBe(true)
    expect(hasReservationPreVisitInput({ afternoon_defecation: false })).toBe(true)
  })
})
