import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cache.js';
import { buildPaginatedResponse, parsePaginationParams } from '../utils/pagination.js';
import { sendJournalNotification } from '../services/notificationService.js';
import {
  isSupabaseStorageAvailable,
  uploadBase64ToSupabaseStorage,
} from '../services/storageService.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

/**
 * 写真配列を処理し、Base64データをSupabase Storageにアップロード
 * @param photos 写真配列（Base64またはURL）
 * @returns 処理後のURL配列
 */
async function processPhotos(photos: string[] | null): Promise<string[] | null> {
  if (!photos || photos.length === 0) {
    return null;
  }

  const processedUrls: string[] = [];

  for (const photo of photos) {
    // 既にURLの場合はそのまま使用
    if (photo.startsWith('http')) {
      processedUrls.push(photo);
      continue;
    }

    // Base64データの場合はSupabase Storageにアップロード
    if (photo.startsWith('data:image/')) {
      if (isSupabaseStorageAvailable()) {
        const result = await uploadBase64ToSupabaseStorage(photo, 'journals');
        if (result) {
          processedUrls.push(result.url);
        } else {
          console.warn('Failed to upload photo to Supabase Storage');
        }
      } else {
        // Supabase Storageが利用できない場合はBase64をそのまま保存（後方互換性）
        console.warn('Supabase Storage is not available, storing Base64 directly');
        processedUrls.push(photo);
      }
    }
  }

  return processedUrls.length > 0 ? processedUrls : null;
}

const router = express.Router();
router.use(authenticate);

// 日誌一覧取得
router.get('/', cacheControl(), async (req: AuthRequest, res) => {
  try {
    const queryParams = req.query as { dog_id?: string | string[]; date?: string | string[]; search?: string | string[]; page?: string | string[]; limit?: string | string[] };
    const { dog_id, date, search } = queryParams;
    const pagination = parsePaginationParams({ page: queryParams.page, limit: queryParams.limit });

    let query = `
      SELECT j.*, 
             d.name as dog_name, d.photo_url as dog_photo,
             o.name as owner_name,
             s.name as staff_name,
             COUNT(*) OVER() as total_count
      FROM journals j
      JOIN dogs d ON j.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      LEFT JOIN staff s ON j.staff_id = s.id
      WHERE o.store_id = $1
    `;
    const params: Array<string | number> = [req.storeId ?? 0];

    if (dog_id) {
      query += ` AND j.dog_id = $${params.length + 1}`;
      params.push(Array.isArray(dog_id) ? dog_id[0] : dog_id);
    }

    if (date) {
      query += ` AND j.journal_date = $${params.length + 1}`;
      params.push(Array.isArray(date) ? date[0] : date);
    }

    if (search) {
      const searchValue = Array.isArray(search) ? search[0] : search;
      query += ` AND (d.name ILIKE $${params.length + 1} OR o.name ILIKE $${params.length + 1} OR j.comment ILIKE $${params.length + 1})`;
      params.push(`%${searchValue}%`);
    }

    query += ` ORDER BY j.journal_date DESC, j.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(query, params);
    const total = result.rows.length > 0 ? Number((result.rows[0] as { total_count?: number }).total_count ?? 0) : 0;
    const data = result.rows.map((row) => {
      const { total_count, ...rest } = row as Record<string, unknown> & { total_count?: number };
      return rest;
    });
    res.json(buildPaginatedResponse(data, total, pagination));
  } catch (error) {
    console.error('Error fetching journals:', error);
    sendServerError(res, '日誌一覧の取得に失敗しました', error);
  }
});

// 特定の犬の日誌写真一覧を取得（軽量API - DogEdit用）
router.get('/photos/:dog_id', async (req: AuthRequest, res) => {
  try {
    const { dog_id } = req.params;

    // 犬のstore_idを確認
    const dogCheck = await pool.query(
      `SELECT o.store_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [dog_id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    // 日誌のIDと日付、写真のみを取得（軽量・直近10件のみ）
    const result = await pool.query(
      `SELECT j.id, j.journal_date, j.photos
       FROM journals j
       JOIN dogs d ON j.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE j.dog_id = $1 AND o.store_id = $2
         AND j.photos IS NOT NULL
       ORDER BY j.journal_date DESC
       LIMIT 10`,
      [dog_id, req.storeId]
    );

    // 写真URLのみを抽出してフラット化
    const photos: { url: string; date: string }[] = [];
    result.rows.forEach((journal: any) => {
      if (journal.photos && Array.isArray(journal.photos)) {
        journal.photos.forEach((photo: string) => {
          // base64データはスキップ（URLのみ許可）
          if (photo && typeof photo === 'string' && photo.startsWith('http')) {
            photos.push({
              url: photo,
              date: journal.journal_date,
            });
          }
        });
      }
    });

    res.json(photos);
  } catch (error) {
    console.error('Error fetching journal photos:', error);
    sendServerError(res, '日誌写真の取得に失敗しました', error);
  }
});

// 日誌詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT j.*, 
              d.name as dog_name, d.photo_url as dog_photo,
              o.name as owner_name,
              s.name as staff_name
       FROM journals j
       JOIN dogs d ON j.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       LEFT JOIN staff s ON j.staff_id = s.id
       WHERE j.id = $1 AND o.store_id = $2`,
      [id, req.storeId]
    );

    if (result.rows.length === 0) {
      sendNotFound(res, '日誌が見つかりません');
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching journal:', error);
    sendServerError(res, '日誌情報の取得に失敗しました', error);
  }
});

// 日誌作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      reservation_id,
      dog_id,
      journal_date,
      visit_count,
      morning_toilet_status,
      morning_toilet_location,
      afternoon_toilet_status,
      afternoon_toilet_location,
      training_data,
      comment,
      next_visit_date,
      photos,
    } = req.body;

    if (!dog_id || !journal_date) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }

    // 犬のstore_idを確認
    const dogCheck = await pool.query(
      `SELECT o.store_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [dog_id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    // 写真をSupabase Storageにアップロード
    const processedPhotos = await processPhotos(photos);

    const result = await pool.query(
      `INSERT INTO journals (
        reservation_id, dog_id, staff_id, journal_date, visit_count,
        morning_toilet_status, morning_toilet_location,
        afternoon_toilet_status, afternoon_toilet_location,
        training_data, comment, next_visit_date, photos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        reservation_id,
        dog_id,
        req.userId,
        journal_date,
        visit_count,
        morning_toilet_status,
        morning_toilet_location,
        afternoon_toilet_status,
        afternoon_toilet_location,
        training_data ? JSON.stringify(training_data) : null,
        comment,
        next_visit_date || null,
        processedPhotos ? JSON.stringify(processedPhotos) : null,
      ]
    );

    // 通知送信（非ブロッキング）
    (async () => {
      try {
        const ownerResult = await pool.query(
          `SELECT o.id, o.store_id, d.name as dog_name
           FROM dogs d
           JOIN owners o ON d.owner_id = o.id
           WHERE d.id = $1`,
          [dog_id]
        );

        if (ownerResult.rows.length > 0) {
          const owner = ownerResult.rows[0];
          const createdJournal = result.rows[0];
          await sendJournalNotification(
            owner.store_id,
            owner.id,
            owner.dog_name,
            journal_date,
            createdJournal.id,
            comment,
            processedPhotos
          );
        }
      } catch (notifError) {
        console.error('Error sending journal notification:', notifError);
        // 通知エラーは日誌作成を阻害しない
      }
    })();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating journal:', error);
    sendServerError(res, '日誌の作成に失敗しました', error);
  }
});

// 日誌更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      morning_toilet_status,
      morning_toilet_location,
      afternoon_toilet_status,
      afternoon_toilet_location,
      training_data,
      comment,
      next_visit_date,
      photos,
    } = req.body;

    // 日誌のstore_idを確認
    const journalCheck = await pool.query(
      `SELECT o.store_id FROM journals j
       JOIN dogs d ON j.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE j.id = $1 AND o.store_id = $2`,
      [id, req.storeId]
    );

    if (journalCheck.rows.length === 0) {
      sendNotFound(res, '日誌が見つかりません');
      return;
    }

    // 写真をSupabase Storageにアップロード
    const processedPhotos = photos ? await processPhotos(photos) : undefined;

    const result = await pool.query(
      `UPDATE journals SET
        morning_toilet_status = COALESCE($1, morning_toilet_status),
        morning_toilet_location = COALESCE($2, morning_toilet_location),
        afternoon_toilet_status = COALESCE($3, afternoon_toilet_status),
        afternoon_toilet_location = COALESCE($4, afternoon_toilet_location),
        training_data = COALESCE($5::jsonb, training_data),
        comment = COALESCE($6, comment),
        next_visit_date = COALESCE($7, next_visit_date),
        photos = COALESCE($8::jsonb, photos),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *`,
      [
        morning_toilet_status,
        morning_toilet_location,
        afternoon_toilet_status,
        afternoon_toilet_location,
        training_data ? JSON.stringify(training_data) : null,
        comment,
        next_visit_date || null,
        processedPhotos ? JSON.stringify(processedPhotos) : null,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating journal:', error);
    sendServerError(res, '日誌の更新に失敗しました', error);
  }
});

export default router;
