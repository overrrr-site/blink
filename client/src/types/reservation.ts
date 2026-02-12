/**
 * Base reservation form fields shared across staff and LIFF reservation forms.
 */
export interface ReservationFormBase {
  reservation_date: string
  reservation_time: string
  pickup_time: string
}

/**
 * Staff-side reservation form with reservation type and notes.
 */
export interface StaffReservationForm extends ReservationFormBase {
  reservation_type: 'regular' | 'single'
  notes: string
}

/**
 * LIFF-side reservation form (owner-facing, no reservation_type).
 */
export interface LiffReservationForm extends ReservationFormBase {
  notes: string
  checkout_date?: string
  checkout_time?: string
  duration_minutes?: number
}
