import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// 犬一覧取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT d.*, o.name as owner_name, o.phone as owner_phone
      FROM dogs d
      JOIN owners o ON d.owner_id = o.id
      WHERE o.store_id = $1 AND d.deleted_at IS NULL AND o.deleted_at IS NULL
    `;
    const params: any[] = [req.storeId];

    if (search) {
      query += ` AND (d.name ILIKE $2 OR o.name ILIKE $2)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    sendServerError(res, '犬一覧の取得に失敗しました', error);
  }
});

// 犬詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const dogResult = await pool.query(
      `SELECT d.*, o.name as owner_name, o.store_id
       FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2 AND d.deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (dogResult.rows.length === 0) {
      sendNotFound(res, '犬が見つかりません');
      return;
    }

    const [healthResult, personalityResult, contractResult, reservationsResult, journalsResult] = await Promise.all([
      pool.query(`SELECT * FROM dog_health WHERE dog_id = $1`, [id]),
      pool.query(`SELECT * FROM dog_personality WHERE dog_id = $1`, [id]),
      pool.query(`SELECT * FROM contracts WHERE dog_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]),
      pool.query(
        `SELECT r.*, 
                o.name as owner_name
         FROM reservations r
         JOIN owners o ON (SELECT owner_id FROM dogs WHERE id = r.dog_id) = o.id
         WHERE r.dog_id = $1 AND r.store_id = $2
         ORDER BY r.reservation_date DESC, r.reservation_time DESC
         LIMIT 50`,
        [id, req.storeId]
      ),
      pool.query(
        `SELECT j.*, 
                r.reservation_date,
                r.reservation_time,
                s.name as staff_name
         FROM journals j
         LEFT JOIN reservations r ON j.reservation_id = r.id
         LEFT JOIN staff s ON j.staff_id = s.id
         WHERE j.dog_id = $1
         ORDER BY j.journal_date DESC, j.created_at DESC
         LIMIT 50`,
        [id]
      ),
    ]);

    res.json({
      ...dogResult.rows[0],
      health: healthResult.rows[0] || null,
      personality: personalityResult.rows[0] || null,
      contract: contractResult.rows[0] || null,
      reservations: reservationsResult.rows || [],
      journals: journalsResult.rows || [],
    });
  } catch (error) {
    console.error('Error fetching dog:', error);
    sendServerError(res, '犬情報の取得に失敗しました', error);
  }
});

// 犬作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      owner_id,
      name,
      breed,
      birth_date,
      gender,
      weight,
      color,
      photo_url,
      neutered,
      health,
      personality,
    } = req.body;

    if (!owner_id || !name || !breed || !birth_date || !gender) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }

    // オーナーのstore_idを確認
    const ownerCheck = await pool.query(
      `SELECT store_id FROM owners WHERE id = $1 AND store_id = $2`,
      [owner_id, req.storeId]
    );

    if (ownerCheck.rows.length === 0) {
      sendForbidden(res);
      return;
    }

    // 空文字列をnullに変換（DB制約対応）
    const neuteredValue = neutered === '' ? null : neutered;

    const dogResult = await pool.query(
      `INSERT INTO dogs (
        owner_id, name, breed, birth_date, gender, weight,
        color, photo_url, neutered
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [owner_id, name, breed, birth_date, gender, weight, color, photo_url, neuteredValue]
    );

    const dogId = dogResult.rows[0].id;

    // 健康情報と性格情報を登録
    if (health) {
      await pool.query(
        `INSERT INTO dog_health (
          dog_id, mixed_vaccine_date, mixed_vaccine_cert_url,
          rabies_vaccine_date, rabies_vaccine_cert_url,
          medical_history, allergies, medications, vet_name, vet_phone, food_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          dogId,
          health.mixed_vaccine_date,
          health.mixed_vaccine_cert_url,
          health.rabies_vaccine_date,
          health.rabies_vaccine_cert_url,
          health.medical_history,
          health.allergies,
          health.medications,
          health.vet_name,
          health.vet_phone,
          health.food_info,
        ]
      );
    }

    if (personality) {
      await pool.query(
        `INSERT INTO dog_personality (
          dog_id, personality_description, dog_compatibility, human_reaction,
          dislikes, likes, biting_habit, biting_habit_detail,
          barking_habit, barking_habit_detail, toilet_status, crate_training
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          dogId,
          personality.personality_description,
          personality.dog_compatibility,
          personality.human_reaction,
          personality.dislikes,
          personality.likes,
          personality.biting_habit,
          personality.biting_habit_detail,
          personality.barking_habit,
          personality.barking_habit_detail,
          personality.toilet_status,
          personality.crate_training,
        ]
      );
    }

    res.status(201).json(dogResult.rows[0]);
  } catch (error) {
    console.error('Error creating dog:', error);
    sendServerError(res, '犬の登録に失敗しました', error);
  }
});

// 犬更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, breed, birth_date, gender, weight, color, photo_url, neutered, health } = req.body;

    // オーナーのstore_idを確認
    const dogCheck = await pool.query(
      `SELECT o.store_id FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2`,
      [id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendNotFound(res, '犬が見つかりません');
      return;
    }

    // 空文字列をnullに変換（DB制約対応）
    const neuteredValue = neutered === '' ? null : neutered;

    const result = await pool.query(
      `UPDATE dogs SET
        name = $1, breed = $2, birth_date = $3, gender = $4,
        weight = $5, color = $6, photo_url = $7, neutered = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *`,
      [name, breed, birth_date, gender, weight, color, photo_url, neuteredValue, id]
    );

    // 健康情報の更新
    if (health) {
      const healthExists = await pool.query(
        `SELECT id FROM dog_health WHERE dog_id = $1`,
        [id]
      );

      if (healthExists.rows.length > 0) {
        await pool.query(
          `UPDATE dog_health SET
            mixed_vaccine_date = $1,
            mixed_vaccine_cert_url = $2,
            rabies_vaccine_date = $3,
            rabies_vaccine_cert_url = $4,
            flea_tick_date = $5,
            medical_history = $6,
            allergies = $7,
            medications = $8,
            vet_name = $9,
            vet_phone = $10,
            food_info = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE dog_id = $12`,
          [
            health.mixed_vaccine_date || null,
            health.mixed_vaccine_cert_url || null,
            health.rabies_vaccine_date || null,
            health.rabies_vaccine_cert_url || null,
            health.flea_tick_date || null,
            health.medical_history || null,
            health.allergies || null,
            health.medications || null,
            health.vet_name || null,
            health.vet_phone || null,
            health.food_info || null,
            id
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO dog_health (
            dog_id, mixed_vaccine_date, mixed_vaccine_cert_url,
            rabies_vaccine_date, rabies_vaccine_cert_url,
            flea_tick_date, medical_history, allergies, medications,
            vet_name, vet_phone, food_info
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            id,
            health.mixed_vaccine_date || null,
            health.mixed_vaccine_cert_url || null,
            health.rabies_vaccine_date || null,
            health.rabies_vaccine_cert_url || null,
            health.flea_tick_date || null,
            health.medical_history || null,
            health.allergies || null,
            health.medications || null,
            health.vet_name || null,
            health.vet_phone || null,
            health.food_info || null
          ]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating dog:', error);
    sendServerError(res, '犬情報の更新に失敗しました', error);
  }
});

// 犬削除（論理削除）
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 犬情報を取得
    const dogCheck = await pool.query(
      `SELECT d.*, o.store_id
       FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND o.store_id = $2 AND d.deleted_at IS NULL`,
      [id, req.storeId]
    );

    if (dogCheck.rows.length === 0) {
      sendNotFound(res, '犬が見つかりません');
      return;
    }

    const dog = dogCheck.rows[0];
    const createdAt = new Date(dog.created_at);
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    if (createdAt > fiveYearsAgo) {
      // 論理削除
      await pool.query(
        `UPDATE dogs SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      res.json({ message: '犬情報を削除しました（論理削除）' });
    } else {
      // 5年以上前のデータは物理削除可能
      await pool.query(`DELETE FROM dogs WHERE id = $1`, [id]);

      res.json({ message: '犬情報を完全に削除しました' });
    }
  } catch (error) {
    console.error('Error deleting dog:', error);
    sendServerError(res, '犬の削除に失敗しました', error);
  }
});

export default router;
