import type { RecordType } from '../types/record'
import {
  BUSINESS_TYPE_CONFIG,
  EMPTY_STATE_ALL,
  getEmptyStateMessage,
  getStatusLabel,
  isSimpleStatusType,
} from '../domain/businessTypeConfig'
export type { EmptyStateConfig } from '../domain/businessTypeConfig'

export const EMPTY_STATE_MESSAGES: Record<RecordType | 'all', { title: string; description: string; actionLabel: string }> = {
  daycare: BUSINESS_TYPE_CONFIG.daycare.emptyState,
  grooming: BUSINESS_TYPE_CONFIG.grooming.emptyState,
  hotel: BUSINESS_TYPE_CONFIG.hotel.emptyState,
  all: EMPTY_STATE_ALL,
}

export const STATUS_LABELS: Record<RecordType, Record<string, string>> = {
  daycare: BUSINESS_TYPE_CONFIG.daycare.statusLabels,
  grooming: BUSINESS_TYPE_CONFIG.grooming.statusLabels,
  hotel: BUSINESS_TYPE_CONFIG.hotel.statusLabels,
}

export { getEmptyStateMessage, getStatusLabel, isSimpleStatusType }
