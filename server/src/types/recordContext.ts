export interface RecordContext {
  record_type: 'grooming' | 'daycare' | 'hotel' | string;
  dog_id?: number;
  dog_name?: string;
  record_date?: string;
  notes?: { report_text?: string | null; internal_notes?: string | null } | null;
  health_check?: Record<string, unknown> | null;
  photos?: Record<string, unknown> | null;
  hotel_data?: Record<string, unknown> | null;
  daycare_data?: Record<string, unknown> | null;
  grooming_data?: Record<string, unknown> | null;
}
