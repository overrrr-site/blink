import type { RecordType } from '../types/record'

interface BusinessTypeAccessParams {
  storeBusinessTypes?: RecordType[] | null
  assignedBusinessTypes?: RecordType[] | null
  isOwner?: boolean | null
}

export function getAvailableBusinessTypes({
  storeBusinessTypes,
  assignedBusinessTypes,
  isOwner,
}: BusinessTypeAccessParams): RecordType[] {
  const storeTypes = (storeBusinessTypes ?? []).filter(Boolean)

  if (storeTypes.length === 0) {
    return []
  }

  if (isOwner) {
    return storeTypes
  }

  if (Array.isArray(assignedBusinessTypes) && assignedBusinessTypes.length > 0) {
    return storeTypes.filter((type) => assignedBusinessTypes.includes(type))
  }

  return storeTypes
}

interface EffectiveBusinessTypeParams {
  selectedBusinessType: RecordType | null
  primaryBusinessType?: RecordType
  availableBusinessTypes: RecordType[]
}

export function getEffectiveBusinessType({
  selectedBusinessType,
  primaryBusinessType,
  availableBusinessTypes,
}: EffectiveBusinessTypeParams): RecordType | undefined {
  if (selectedBusinessType && availableBusinessTypes.includes(selectedBusinessType)) {
    return selectedBusinessType
  }

  if (primaryBusinessType && availableBusinessTypes.includes(primaryBusinessType)) {
    return primaryBusinessType
  }

  return availableBusinessTypes[0]
}

export function isBusinessTypeVisible(
  selectedBusinessType: RecordType | null,
  availableBusinessTypes: RecordType[],
  type: RecordType,
): boolean {
  if (selectedBusinessType) {
    return selectedBusinessType === type
  }

  return availableBusinessTypes.includes(type)
}
