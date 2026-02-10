import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useBusinessTypeStore } from '../store/businessTypeStore'
import { getAvailableBusinessTypes, getEffectiveBusinessType } from '../utils/businessTypeAccess'
import {
  getDashboardEmptyStateMessage,
  getEmptyStateMessage,
  getRecordLabel,
} from '../domain/businessTypeConfig'
import type { RecordType } from '../types/record'

export interface BusinessTypeFilterState {
  selectedBusinessType: RecordType | null
  availableBusinessTypes: RecordType[]
  effectiveBusinessType: RecordType | undefined
  recordLabel: string
  serviceTypeParam: string
  recordTypeParam: string
  emptyState: ReturnType<typeof getEmptyStateMessage>
  dashboardEmptyState: ReturnType<typeof getDashboardEmptyStateMessage>
}

export function useBusinessTypeFilter(): BusinessTypeFilterState {
  const user = useAuthStore((s) => s.user)
  const { selectedBusinessType } = useBusinessTypeStore()

  const availableBusinessTypes = useMemo(
    () => getAvailableBusinessTypes({
      storeBusinessTypes: user?.businessTypes,
      assignedBusinessTypes: user?.assignedBusinessTypes,
      isOwner: user?.isOwner,
    }),
    [user?.assignedBusinessTypes, user?.businessTypes, user?.isOwner]
  )

  const effectiveBusinessType = useMemo(
    () => getEffectiveBusinessType({
      selectedBusinessType,
      primaryBusinessType: user?.primaryBusinessType,
      availableBusinessTypes,
    }),
    [availableBusinessTypes, selectedBusinessType, user?.primaryBusinessType]
  )

  const recordLabel = getRecordLabel(effectiveBusinessType)
  const serviceTypeParam = selectedBusinessType ? `service_type=${selectedBusinessType}` : ''
  const recordTypeParam = selectedBusinessType ? `record_type=${selectedBusinessType}` : ''

  return {
    selectedBusinessType,
    availableBusinessTypes,
    effectiveBusinessType,
    recordLabel,
    serviceTypeParam,
    recordTypeParam,
    emptyState: getEmptyStateMessage(selectedBusinessType),
    dashboardEmptyState: getDashboardEmptyStateMessage(selectedBusinessType),
  }
}
