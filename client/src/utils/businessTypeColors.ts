import type { RecordType } from '../types/record'

export interface BusinessTypeColors {
  primary: string
  light: string
  pale: string
  label: string
  icon: string
}

const COLORS: Record<RecordType, BusinessTypeColors> = {
  grooming: {
    primary: '#8B5CF6',
    light: '#C4B5FD',
    pale: '#F5F3FF',
    label: 'グルーミング',
    icon: 'solar:scissors-bold',
  },
  daycare: {
    primary: '#F97316',
    light: '#FDBA74',
    pale: '#FFF7ED',
    label: '幼稚園',
    icon: 'solar:sun-bold',
  },
  hotel: {
    primary: '#06B6D4',
    light: '#67E8F9',
    pale: '#ECFEFF',
    label: 'ホテル',
    icon: 'solar:moon-bold',
  },
}

export const AI_COLOR = '#6366F1'

export function getBusinessTypeColors(type: RecordType): BusinessTypeColors {
  return COLORS[type] || COLORS.daycare
}

export function getBusinessTypeLabel(type: RecordType): string {
  return COLORS[type]?.label || type
}

export function getBusinessTypeIcon(type: RecordType): string {
  return COLORS[type]?.icon || 'solar:document-bold'
}

/**
 * 業態に応じたカルテの呼称を返す
 * - 幼稚園（daycare）→「連絡帳」
 * - サロン（grooming）/ ホテル（hotel）→「カルテ」
 */
export function getRecordLabel(type?: RecordType): string {
  return type === 'daycare' ? '連絡帳' : 'カルテ'
}
