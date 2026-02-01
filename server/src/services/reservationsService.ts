import pool from '../db/connection.js';
import {
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

/**
 * 犬IDから犬名・飼い主名を取得する
 */
async function fetchDogOwnerInfoByDogId(dogId: number): Promise<DogOwnerInfo | null> {
  const result = await pool.query<DogOwnerInfo>(
    `SELECT d.name as dog_name, o.name as owner_name
     FROM dogs d
     JOIN owners o ON d.owner_id = o.id
     WHERE d.id = $1`,
    [dogId]
  );
  return result.rows[0] ?? null;
}

/**
 * 予約IDから犬名・飼い主名を取得する
 */
async function fetchDogOwnerInfoByReservationId(reservationId: number): Promise<DogOwnerInfo | null> {
  const result = await pool.query<DogOwnerInfo>(
    `SELECT d.name as dog_name, o.name as owner_name
     FROM dogs d
     JOIN owners o ON d.owner_id = o.id
     JOIN reservations r ON r.dog_id = d.id
     WHERE r.id = $1`,
    [reservationId]
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

export async function syncCalendarOnCreate(params: {
  storeId: number;
  reservation: ReservationForSync;
  dogId: number;
}): Promise<void> {
  try {
    const info = await fetchDogOwnerInfoByDogId(params.dogId);
    if (!info) return;
    await createCalendarEvent(params.storeId, params.reservation, info.dog_name, info.owner_name);
  } catch (error) {
    logCalendarSyncError('作成', error);
  }
}

export async function syncCalendarOnUpdate(params: {
  storeId: number;
  reservationId: number;
  reservation: ReservationForSync;
  status?: string;
}): Promise<void> {
  try {
    if (params.status === 'キャンセル') {
      await deleteCalendarEvent(params.storeId, params.reservationId);
      return;
    }

    const info = await fetchDogOwnerInfoByReservationId(params.reservationId);
    if (!info) return;
    await updateCalendarEvent(params.storeId, params.reservation, info.dog_name, info.owner_name);
  } catch (error) {
    logCalendarSyncError('更新', error);
  }
}

export async function syncCalendarOnDelete(params: {
  storeId: number;
  reservationId: number;
}): Promise<void> {
  try {
    await deleteCalendarEvent(params.storeId, params.reservationId);
  } catch (error) {
    logCalendarSyncError('削除', error);
  }
}
