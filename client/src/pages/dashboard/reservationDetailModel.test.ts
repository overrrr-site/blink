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

  it('returns false when no pre-visit data', () => {
    expect(hasReservationPreVisitInput({})).toBe(false)
  })

  it('returns true when daycare_data is present', () => {
    expect(hasReservationPreVisitInput({
      daycare_data: { pickup_time: '17:00', energy: 'good', appetite: 'good', poop: 'normal', pee: 'normal', vomiting: false, itching: false, medication: false }
    })).toBe(true)
  })

  it('returns true when grooming_data is present', () => {
    expect(hasReservationPreVisitInput({ grooming_data: { counseling: {} } })).toBe(true)
  })

  it('returns true when hotel_data is present', () => {
    expect(hasReservationPreVisitInput({ hotel_data: { feeding_schedule: {} } })).toBe(true)
  })
})
