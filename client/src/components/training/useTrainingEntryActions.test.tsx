import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trainingProfilesApi } from '../../api/trainingProfiles'
import { useTrainingEntryActions } from './useTrainingEntryActions'

vi.mock('../../api/trainingProfiles', () => ({
  trainingProfilesApi: {
    getProfile: vi.fn(),
    upsertGridEntry: vi.fn(),
    deleteGridEntry: vi.fn(),
    createLogEntry: vi.fn(),
    updateLogEntry: vi.fn(),
    deleteLogEntry: vi.fn(),
    createConcernEntry: vi.fn(),
    updateConcernEntry: vi.fn(),
    deleteConcernEntry: vi.fn(),
  },
}))

describe('useTrainingEntryActions', () => {
  const apiMock = vi.mocked(trainingProfilesApi)

  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.createLogEntry.mockResolvedValue({} as never)
    apiMock.updateLogEntry.mockResolvedValue({} as never)
    apiMock.deleteLogEntry.mockResolvedValue({} as never)
    apiMock.createConcernEntry.mockResolvedValue({} as never)
    apiMock.updateConcernEntry.mockResolvedValue({} as never)
    apiMock.deleteConcernEntry.mockResolvedValue({} as never)
  })

  it('dispatches CRUD actions to log endpoints in log mode', async () => {
    const onMutate = vi.fn()

    const { result } = renderHook(() => useTrainingEntryActions({
      mode: 'log',
      dogId: '12',
      categoryId: 7,
      onMutate,
    }))

    act(() => {
      result.current.changeNewDate('2026-02-10')
      result.current.changeNewNote('log-note')
    })

    await act(async () => {
      await result.current.submitAdd()
    })

    act(() => {
      result.current.startEditing({ id: 44, note: 'before' })
      result.current.changeEditNote('after')
    })

    await act(async () => {
      await result.current.submitUpdate(44)
    })

    await act(async () => {
      await result.current.submitDelete(44)
    })

    expect(apiMock.createLogEntry).toHaveBeenCalledWith({
      dogId: '12',
      categoryId: 7,
      entryDate: '2026-02-10',
      note: 'log-note',
    })
    expect(apiMock.updateLogEntry).toHaveBeenCalledWith({
      dogId: '12',
      entryId: 44,
      note: 'after',
    })
    expect(apiMock.deleteLogEntry).toHaveBeenCalledWith({
      dogId: '12',
      entryId: 44,
    })
    expect(apiMock.createConcernEntry).not.toHaveBeenCalled()
    expect(apiMock.updateConcernEntry).not.toHaveBeenCalled()
    expect(apiMock.deleteConcernEntry).not.toHaveBeenCalled()
    expect(onMutate).toHaveBeenCalledTimes(3)
  })

  it('dispatches CRUD actions to concern endpoints in concern mode', async () => {
    const onMutate = vi.fn()

    const { result } = renderHook(() => useTrainingEntryActions({
      mode: 'concern',
      dogId: '12',
      onMutate,
    }))

    act(() => {
      result.current.changeNewDate('2026-02-11')
      result.current.changeNewNote('concern-note')
    })

    await act(async () => {
      await result.current.submitAdd()
    })

    act(() => {
      result.current.startEditing({ id: 55, note: 'old' })
      result.current.changeEditNote('new')
    })

    await act(async () => {
      await result.current.submitUpdate(55)
    })

    await act(async () => {
      await result.current.submitDelete(55)
    })

    expect(apiMock.createConcernEntry).toHaveBeenCalledWith({
      dogId: '12',
      entryDate: '2026-02-11',
      note: 'concern-note',
    })
    expect(apiMock.updateConcernEntry).toHaveBeenCalledWith({
      dogId: '12',
      entryId: 55,
      note: 'new',
    })
    expect(apiMock.deleteConcernEntry).toHaveBeenCalledWith({
      dogId: '12',
      entryId: 55,
    })
    expect(apiMock.createLogEntry).not.toHaveBeenCalled()
    expect(apiMock.updateLogEntry).not.toHaveBeenCalled()
    expect(apiMock.deleteLogEntry).not.toHaveBeenCalled()
    expect(onMutate).toHaveBeenCalledTimes(3)
  })
})
