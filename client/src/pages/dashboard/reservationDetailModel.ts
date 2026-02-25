import type { DaycarePreVisitData } from '../../types/daycarePreVisit'

export type ReservationServiceType = 'daycare' | 'grooming' | 'hotel'

interface ReservationDetailPreVisitData {
  daycare_data?: DaycarePreVisitData | null
  grooming_data?: unknown | null
  hotel_data?: unknown | null
}

interface ServiceTypeRenderFlags {
  showDaycare: boolean
  showGrooming: boolean
  showHotel: boolean
}

export function normalizeReservationServiceType(
  serviceType: ReservationServiceType | null | undefined
): ReservationServiceType {
  return serviceType ?? 'daycare'
}

export function getServiceTypeRenderFlags(
  serviceType: ReservationServiceType
): ServiceTypeRenderFlags {
  return {
    showDaycare: serviceType === 'daycare',
    showGrooming: serviceType === 'grooming',
    showHotel: serviceType === 'hotel',
  }
}

export function hasReservationPreVisitInput(
  reservation: ReservationDetailPreVisitData
): boolean {
  return Boolean(
    reservation.daycare_data ||
    reservation.grooming_data ||
    reservation.hotel_data
  )
}
