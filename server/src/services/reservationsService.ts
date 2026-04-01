import pool from '../db/connection.js';
import {
  getGoogleCalendarIntegration,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './googleCalendar.js';

interface ReservationForSync {
  id: number;
  reservation_date: string | Date;
  reservation_time?: string;
  memo?: string | null;
}

interface DogOwnerInfo {
  dog_name: string;
  owner_name: string;
}

export type ReservationCalendarSyncStatus = 'synced' | 'skipped' | 'failed';

export interface ReservationCalendarSyncResult {
  status: ReservationCalendarSyncStatus;
  reason?: string;
}

/**
 * 犬IDから犬名・飼い主名を取得する
 */
async function fetchDogOwnerInfoByDogId(dogId: number, storeId: number): Promise<DogOwnerInfo | null> {
  const result = await pool.query<DogOwnerInfo>(
    `SELECT d.name as dog_name, o.name as owner_name
     FROM dogs d
     JOIN owners o ON d.owner_id = o.id
     WHERE d.id = $1 AND o.store_id = $2`,
    [dogId, storeId]
  );
  return result.rows[0] ?? null;
}

/**
 * 予約IDから犬名・飼い主名を取得する
 */
async function fetchDogOwnerInfoByReservationId(reservationId: number, storeId: number): Promise<DogOwnerInfo | null> {
  const result = await pool.query<DogOwnerInfo>(
    `SELECT d.name as dog_name, o.name as owner_name
     FROM dogs d
     JOIN owners o ON d.owner_id = o.id
     JOIN reservations r ON r.dog_id = d.id
     WHERE r.id = $1 AND r.store_id = $2`,
    [reservationId, storeId]
  );
  return result.rows[0] ?? null;
}

/**
 * カレンダー同期のエラーをログ出力する共通ハンドラ
 */
function logCalendarSyncError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : error;
  console.error(`Googleカレンダー同期エラー（${context}）:`, message);
}

function buildFailureResult(error: unknown): ReservationCalendarSyncResult {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('リフレッシュトークン') || message.includes('invalid_grant')) {
    return {
      status: 'failed',
      reason: 'Googleカレンダーの再認証が必要です',
    };
  }
  return {
    status: 'failed',
    reason: message || 'Googleカレンダー同期に失敗しました',
  };
}

async function hasEnabledCalendarIntegration(storeId: number): Promise<boolean> {
  const integration = await getGoogleCalendarIntegration(storeId);
  return Boolean(integration);
}

export async function syncCalendarOnCreate(params: {
  storeId: number;
  reservation: ReservationForSync;
  dogId: number;
}): Promise<ReservationCalendarSyncResult> {
  try {
    if (!(await hasEnabledCalendarIntegration(params.storeId))) {
      return { status: 'skipped' };
    }

    const info = await fetchDogOwnerInfoByDogId(params.dogId, params.storeId);
    if (!info) {
      return {
        status: 'failed',
        reason: '予約対象の犬情報を取得できません',
      };
    }
    await createCalendarEvent(params.storeId, params.reservation, info.dog_name, info.owner_name);
    return { status: 'synced' };
  } catch (error) {
    logCalendarSyncError('作成', error);
    return buildFailureResult(error);
  }
}

export async function syncCalendarOnUpdate(params: {
  storeId: number;
  reservationId: number;
  reservation: ReservationForSync;
  status?: string;
}): Promise<ReservationCalendarSyncResult> {
  try {
    if (!(await hasEnabledCalendarIntegration(params.storeId))) {
      return { status: 'skipped' };
    }

    if (params.status === 'キャンセル') {
      await deleteCalendarEvent(params.storeId, params.reservationId);
      return { status: 'synced' };
    }

    const info = await fetchDogOwnerInfoByReservationId(params.reservationId, params.storeId);
    if (!info) {
      return {
        status: 'failed',
        reason: '予約対象の犬情報を取得できません',
      };
    }
    await updateCalendarEvent(params.storeId, params.reservation, info.dog_name, info.owner_name);
    return { status: 'synced' };
  } catch (error) {
    logCalendarSyncError('更新', error);
    return buildFailureResult(error);
  }
}

export async function syncCalendarOnDelete(params: {
  storeId: number;
  reservationId: number;
}): Promise<ReservationCalendarSyncResult> {
  try {
    if (!(await hasEnabledCalendarIntegration(params.storeId))) {
      return { status: 'skipped' };
    }
    await deleteCalendarEvent(params.storeId, params.reservationId);
    return { status: 'synced' };
  } catch (error) {
    logCalendarSyncError('削除', error);
    return buildFailureResult(error);
  }
}
