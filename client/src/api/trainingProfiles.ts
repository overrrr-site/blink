import api from './client'
import type { TrainingProfileData } from '../types/trainingProfile'
import { normalizeEntryDate } from '../utils/trainingDate'

type DogId = string | number

type LogEntryPayload = {
  dogId: DogId
  categoryId: number
  entryDate: string
  note: string
}

type ConcernEntryPayload = {
  dogId: DogId
  entryDate: string
  note: string
}

type GridEntryUpsertPayload = {
  dogId: DogId
  categoryId: number
  trainingItemId: number
  entryDate: string
  achievementSymbol: string
}

type EntryUpdatePayload = {
  dogId: DogId
  entryId: number
  note: string
}

type EntryDeletePayload = {
  dogId: DogId
  entryId: number
}

export const trainingProfilesApi = {
  getProfile: async (dogId: DogId): Promise<TrainingProfileData> => {
    const response = await api.get<TrainingProfileData>(`/training-profiles/dogs/${dogId}/all`)
    return normalizeTrainingProfileData(response.data)
  },

  upsertGridEntry: ({
    dogId,
    categoryId,
    trainingItemId,
    entryDate,
    achievementSymbol,
  }: GridEntryUpsertPayload) => api.put(`/training-profiles/dogs/${dogId}/grid`, {
    category_id: categoryId,
    training_item_id: trainingItemId,
    entry_date: entryDate,
    achievement_symbol: achievementSymbol,
  }),

  deleteGridEntry: ({ dogId, entryId }: EntryDeletePayload) =>
    api.delete(`/training-profiles/dogs/${dogId}/grid/${entryId}`),

  createLogEntry: ({ dogId, categoryId, entryDate, note }: LogEntryPayload) =>
    api.post(`/training-profiles/dogs/${dogId}/logs`, {
      category_id: categoryId,
      entry_date: entryDate,
      note,
    }),

  updateLogEntry: ({ dogId, entryId, note }: EntryUpdatePayload) =>
    api.put(`/training-profiles/dogs/${dogId}/logs/${entryId}`, { note }),

  deleteLogEntry: ({ dogId, entryId }: EntryDeletePayload) =>
    api.delete(`/training-profiles/dogs/${dogId}/logs/${entryId}`),

  createConcernEntry: ({ dogId, entryDate, note }: ConcernEntryPayload) =>
    api.post(`/training-profiles/dogs/${dogId}/concerns`, {
      entry_date: entryDate,
      note,
    }),

  updateConcernEntry: ({ dogId, entryId, note }: EntryUpdatePayload) =>
    api.put(`/training-profiles/dogs/${dogId}/concerns/${entryId}`, { note }),

  deleteConcernEntry: ({ dogId, entryId }: EntryDeletePayload) =>
    api.delete(`/training-profiles/dogs/${dogId}/concerns/${entryId}`),
}

function normalizeTrainingProfileData(data: TrainingProfileData): TrainingProfileData {
  return {
    ...data,
    gridEntries: data.gridEntries.map((entry) => ({
      ...entry,
      entry_date: normalizeEntryDate(entry.entry_date),
    })),
    logEntries: data.logEntries.map((entry) => ({
      ...entry,
      entry_date: normalizeEntryDate(entry.entry_date),
    })),
    concerns: data.concerns.map((entry) => ({
      ...entry,
      entry_date: normalizeEntryDate(entry.entry_date),
    })),
  }
}
