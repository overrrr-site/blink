import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import { useAuthStore } from '../store/authStore'
import { useBusinessTypeStore } from '../store/businessTypeStore'

describe('useBusinessTypeFilter', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null })
    useBusinessTypeStore.setState({ selectedBusinessType: null })
  })

  it('filters available business types by assignment', () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'staff@example.com',
        name: 'Staff',
        storeId: 1,
        isOwner: false,
        businessTypes: ['daycare', 'grooming'],
        assignedBusinessTypes: ['grooming'],
        primaryBusinessType: 'daycare',
      },
    } as any)

    const { result } = renderHook(() => useBusinessTypeFilter())

    expect(result.current.availableBusinessTypes).toEqual(['grooming'])
    expect(result.current.effectiveBusinessType).toBe('grooming')
    expect(result.current.recordLabel).toBe('カルテ')
  })

  it('builds service/record type params from selection', () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'owner@example.com',
        name: 'Owner',
        storeId: 1,
        isOwner: true,
        businessTypes: ['daycare', 'grooming'],
        primaryBusinessType: 'daycare',
      },
    } as any)
    useBusinessTypeStore.setState({ selectedBusinessType: 'daycare' })

    const { result } = renderHook(() => useBusinessTypeFilter())

    expect(result.current.serviceTypeParam).toBe('service_type=daycare')
    expect(result.current.recordTypeParam).toBe('record_type=daycare')
  })
})
