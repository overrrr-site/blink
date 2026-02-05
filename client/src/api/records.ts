import api from './client'
import type { RecordFormData } from '../types/record'

export const recordsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/records', { params }),

  get: (id: number | string) =>
    api.get(`/records/${id}`),

  create: (data: RecordFormData) =>
    api.post('/records', data),

  update: (id: number | string, data: Partial<RecordFormData>) =>
    api.put(`/records/${id}`, data),

  delete: (id: number | string) =>
    api.delete(`/records/${id}`),

  share: (id: number | string) =>
    api.post(`/records/${id}/share`),

  getLatest: (dogId: number | string, recordType?: string) =>
    api.get(`/records/dogs/${dogId}/latest`, {
      params: recordType ? { record_type: recordType } : undefined,
    }),

  uploadPhoto: (id: number | string, data: { photo: string; type?: string; label?: string; annotation?: { x: number; y: number } }) =>
    api.post(`/records/${id}/photos`, data),

  deletePhoto: (id: number | string, photoIndex: number, type?: string) =>
    api.delete(`/records/${id}/photos/${photoIndex}`, {
      params: type ? { type } : undefined,
    }),
}
