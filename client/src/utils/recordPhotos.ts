import type { Photo, ConcernPhoto, PhotosData } from '@/types/record'

type RawPhoto = string | { id?: string; url: string; uploadedAt?: string }
type RawConcern = string | { id?: string; url: string; uploadedAt?: string; label?: string; annotation?: { x: number; y: number } }

type RawPhotosData = {
  regular?: RawPhoto[]
  concerns?: RawConcern[]
} | null | undefined

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createPhoto = (url: string, existing?: Partial<Photo>): Photo => ({
  id: existing?.id || createId(),
  url,
  uploadedAt: existing?.uploadedAt || new Date().toISOString(),
})

const createConcernPhoto = (url: string, existing?: Partial<ConcernPhoto>): ConcernPhoto => ({
  id: existing?.id || createId(),
  url,
  uploadedAt: existing?.uploadedAt || new Date().toISOString(),
  label: existing?.label,
  annotation: existing?.annotation,
})

export const normalizePhotosData = (raw: RawPhotosData): PhotosData => {
  const regularRaw = raw?.regular || []
  const concernsRaw = raw?.concerns || []

  const regular: Photo[] = regularRaw
    .map((item) => {
      if (typeof item === 'string') {
        return createPhoto(item)
      }
      if (item && typeof item === 'object' && 'url' in item) {
        return createPhoto(item.url, item)
      }
      return null
    })
    .filter((item): item is Photo => item !== null)

  const concerns: ConcernPhoto[] = concernsRaw
    .map((item) => {
      if (typeof item === 'string') {
        return createConcernPhoto(item)
      }
      if (item && typeof item === 'object' && 'url' in item) {
        return createConcernPhoto(item.url, item)
      }
      return null
    })
    .filter((item): item is ConcernPhoto => item !== null)

  return { regular, concerns }
}

export const createLocalPhoto = (url: string): Photo => createPhoto(url)

export const createLocalConcernPhoto = (url: string, label?: string): ConcernPhoto =>
  createConcernPhoto(url, { label })
