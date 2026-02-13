export type ReservationServiceType = 'daycare' | 'grooming' | 'hotel'

interface MealData {
  time: string
  food_name: string
  amount: string
}

interface ReservationDetailPreVisitData {
  grooming_data?: unknown | null
  hotel_data?: unknown | null
  pre_visit_notes?: string | null
  breakfast_status?: string | null
  health_status?: string | null
  meal_data?: MealData[] | null
  morning_urination?: boolean | null
  morning_defecation?: boolean | null
  afternoon_urination?: boolean | null
  afternoon_defecation?: boolean | null
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
    reservation.grooming_data ||
      reservation.hotel_data ||
      reservation.pre_visit_notes ||
      reservation.breakfast_status ||
      reservation.health_status ||
      (reservation.meal_data && reservation.meal_data.length > 0) ||
      reservation.morning_urination !== null && reservation.morning_urination !== undefined ||
      reservation.morning_defecation !== null && reservation.morning_defecation !== undefined ||
      reservation.afternoon_urination !== null && reservation.afternoon_urination !== undefined ||
      reservation.afternoon_defecation !== null && reservation.afternoon_defecation !== undefined
  )
}
