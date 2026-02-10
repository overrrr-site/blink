import { randomUUID } from 'crypto';
import {
  isSupabaseStorageAvailable,
  uploadBase64ToSupabaseStorage,
} from './storageService.js';

export type PhotoInput = string | { id?: string; url: string; uploadedAt?: string };
export type ConcernInput = string | {
  id?: string;
  url: string;
  uploadedAt?: string;
  label?: string;
  annotation?: { x: number; y: number };
};

export function createPhotoId(): string {
  return typeof randomUUID === 'function'
    ? randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePhotoItem(item: PhotoInput): { id: string; url: string; uploadedAt: string } | null {
  if (typeof item === 'string') {
    return { id: createPhotoId(), url: item, uploadedAt: new Date().toISOString() };
  }
  if (item && typeof item === 'object' && typeof item.url === 'string') {
    return {
      id: item.id || createPhotoId(),
      url: item.url,
      uploadedAt: item.uploadedAt || new Date().toISOString(),
    };
  }
  return null;
}

function normalizeConcernItem(
  item: ConcernInput
): { id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } } | null {
  if (typeof item === 'string') {
    return { id: createPhotoId(), url: item, uploadedAt: new Date().toISOString() };
  }
  if (item && typeof item === 'object' && typeof item.url === 'string') {
    return {
      id: item.id || createPhotoId(),
      url: item.url,
      uploadedAt: item.uploadedAt || new Date().toISOString(),
      label: item.label,
      annotation: item.annotation,
    };
  }
  return null;
}

export function normalizeStoredPhotos(
  photos: { regular?: PhotoInput[]; concerns?: ConcernInput[] } | string | null | undefined
) {
  let parsed: unknown = photos;
  if (typeof photos === 'string') {
    try {
      parsed = JSON.parse(photos);
    } catch {
      parsed = null;
    }
  }
  const parsedObject =
    parsed && typeof parsed === 'object'
      ? parsed as { regular?: unknown; concerns?: unknown }
      : null;
  const regular: Array<{ id: string; url: string; uploadedAt: string }> = [];
  const concerns: Array<{ id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } }> = [];

  const regularItems = Array.isArray(parsedObject?.regular) ? parsedObject.regular : [];
  regularItems.forEach((item) => {
    const normalized = normalizePhotoItem(item);
    if (normalized) regular.push(normalized);
  });

  const concernItems = Array.isArray(parsedObject?.concerns) ? parsedObject.concerns : [];
  concernItems.forEach((item) => {
    const normalized = normalizeConcernItem(item);
    if (normalized) concerns.push(normalized);
  });

  return { regular, concerns };
}

export async function resolveRecordPhotoUrl(photo: string): Promise<string> {
  if (photo.startsWith('data:image/') && isSupabaseStorageAvailable()) {
    const uploaded = await uploadBase64ToSupabaseStorage(photo, 'records');
    if (uploaded) {
      return uploaded.url;
    }
  }
  return photo;
}

/**
 * 写真配列を処理し、Base64データをSupabase Storageにアップロード
 */
export async function processRecordPhotos(
  photosData: { regular?: PhotoInput[]; concerns?: ConcernInput[] } | null
): Promise<{ regular: Array<{ id: string; url: string; uploadedAt: string }>; concerns: Array<{ id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } }> } | null> {
  if (!photosData) return null;

  const result = { regular: [] as Array<{ id: string; url: string; uploadedAt: string }>, concerns: [] as Array<{ id: string; url: string; uploadedAt: string; label?: string; annotation?: { x: number; y: number } }> };

  if (photosData.regular && photosData.regular.length > 0) {
    for (const item of photosData.regular) {
      const normalized = normalizePhotoItem(item);
      if (!normalized) continue;
      const uploadedUrl = normalized.url.startsWith('data:image/')
        ? await resolveRecordPhotoUrl(normalized.url)
        : normalized.url;
      result.regular.push({ ...normalized, url: uploadedUrl });
    }
  }

  if (photosData.concerns && photosData.concerns.length > 0) {
    for (const item of photosData.concerns) {
      const normalized = normalizeConcernItem(item);
      if (!normalized) continue;
      const uploadedUrl = normalized.url.startsWith('data:image/')
        ? await resolveRecordPhotoUrl(normalized.url)
        : normalized.url;
      result.concerns.push({ ...normalized, url: uploadedUrl });
    }
  }

  return result;
}
