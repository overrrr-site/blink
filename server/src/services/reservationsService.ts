import pool from '../db/connection.js'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './googleCalendar.js'

export async function syncCalendarOnCreate(params: {
  storeId: number
  reservation: any
  dogId: number
}): Promise<void> {
  try {
    const { storeId, reservation, dogId } = params
    const dogInfo = await pool.query(
      `SELECT d.name as dog_name, o.name as owner_name
       FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1`,
      [dogId]
    )

    if (dogInfo.rows.length > 0) {
      await createCalendarEvent(
        storeId,
        reservation,
        dogInfo.rows[0].dog_name,
        dogInfo.rows[0].owner_name
      )
    }
  } catch (error) {
    console.error('Googleカレンダー同期エラー（予約は作成済み）:', error)
  }
}

export async function syncCalendarOnUpdate(params: {
  storeId: number
  reservationId: number
  reservation: any
  status?: string
}): Promise<void> {
  try {
    const { storeId, reservationId, reservation, status } = params
    const dogInfo = await pool.query(
      `SELECT d.name as dog_name, o.name as owner_name
       FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       JOIN reservations r ON r.dog_id = d.id
       WHERE r.id = $1`,
      [reservationId]
    )

    if (dogInfo.rows.length === 0) {
      return
    }

    if (status === 'キャンセル') {
      await deleteCalendarEvent(storeId, reservationId)
      return
    }

    await updateCalendarEvent(
      storeId,
      reservation,
      dogInfo.rows[0].dog_name,
      dogInfo.rows[0].owner_name
    )
  } catch (error) {
    console.error('Googleカレンダー同期エラー（予約は更新済み）:', error)
  }
}

export async function syncCalendarOnDelete(params: {
  storeId: number
  reservationId: number
}): Promise<void> {
  try {
    await deleteCalendarEvent(params.storeId, params.reservationId)
  } catch (error) {
    console.error('Googleカレンダー削除エラー（予約削除は続行）:', error)
  }
}
