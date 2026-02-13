import type { RecordType } from '@/types/record'

export const isDaycareRecordType = (recordType: RecordType): recordType is 'daycare' =>
  recordType === 'daycare'

export const getRecordTypeSectionTitle = (recordType: RecordType): string =>
  recordType === 'grooming' ? 'カット内容' : '宿泊情報'
