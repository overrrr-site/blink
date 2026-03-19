import type { DaycarePreVisitData } from '../../../types/daycarePreVisit';
import type { RecordType } from '../../../types/record';

export interface PreVisitReservation {
  id: number;
  dog_id: number;
  dog_name: string;
  reservation_date: string;
  reservation_time: string;
  service_type?: 'daycare' | 'grooming' | 'hotel';
  pre_visit_service_type?: 'daycare' | 'grooming' | 'hotel';
  has_pre_visit_input: boolean;
  daycare_data?: DaycarePreVisitData | null;
  grooming_data?: GroomingPreVisitData;
  hotel_data?: HotelPreVisitData;
}

export interface GroomingPreVisitData {
  counseling?: {
    style_request?: string;
    caution_notes?: string;
    condition_notes?: string;
    consent_confirmed?: boolean;
  };
  pre_visit?: {
    pickup_time?: string;
    completion_contact?: 'line' | 'phone' | 'none';
    day_of_notes?: string;
  };
}

export interface HotelPreVisitData {
  feeding_schedule?: {
    morning?: string;
    evening?: string;
    snack?: string;
  };
  medication?: {
    has_medication?: boolean;
    details?: string;
  };
  walk_preference?: string;
  sleeping_habit?: string;
  special_notes?: string;
  emergency_contact_confirmed?: boolean;
}

export const DEFAULT_GROOMING_DATA: GroomingPreVisitData = {
  counseling: {
    style_request: '',
    caution_notes: '',
    condition_notes: '',
    consent_confirmed: false,
  },
  pre_visit: {
    pickup_time: '',
    completion_contact: 'line',
    day_of_notes: '',
  },
};

export const DEFAULT_HOTEL_DATA: HotelPreVisitData = {
  feeding_schedule: { morning: '', evening: '', snack: '' },
  medication: { has_medication: false, details: '' },
  walk_preference: '',
  sleeping_habit: '',
  special_notes: '',
  emergency_contact_confirmed: false,
};

export function normalizeGroomingPreVisitData(raw: unknown): GroomingPreVisitData {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_GROOMING_DATA;
  }

  const source = raw as GroomingPreVisitData;

  return {
    counseling: {
      style_request: source.counseling?.style_request || '',
      caution_notes: source.counseling?.caution_notes || '',
      condition_notes: source.counseling?.condition_notes || '',
      consent_confirmed: source.counseling?.consent_confirmed || false,
    },
    pre_visit: {
      pickup_time: source.pre_visit?.pickup_time || '',
      completion_contact: source.pre_visit?.completion_contact || 'line',
      day_of_notes: source.pre_visit?.day_of_notes || '',
    },
  };
}

export type { DaycarePreVisitData, RecordType };
