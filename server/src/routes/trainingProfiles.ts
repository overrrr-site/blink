import express from 'express';
import pool from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendNotFound, sendBadRequest, sendServerError, sendSuccess } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// ---------------------------------------------------------------------------
// Default seed data
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  { name: 'コマンド達成状況', category_type: 'grid', goal: null },
  { name: 'フリープレイ', category_type: 'log', goal: '自由にできる空間で、犬と遊ぶもしくは、適度な交流を持ち、人に呼ばれたらスムーズに戻ってくることを目指す' },
  { name: '社会性', category_type: 'log', goal: '人や刺激、犬に対して、吠える、噛む、鼻にしわを寄せる、襲いかかる、飛びつこうとする、遊びを仕掛ける、逃げる行動が見られない' },
  { name: 'トイレトレーニング', category_type: 'log', goal: '排泄環境を整え、安心して、排泄ができるようにする' },
  { name: 'クレートトレーニング', category_type: 'log', goal: '休息の場所や安心できる場所として教え、自ら入ることができるようにする' },
  { name: '散歩', category_type: 'log', goal: '対象物に対して吠えない・凝視しない、引っ張らない、呼べは人に意識を向けられる、フードが食べられる状態を保つことを目指す' },
];

const DEFAULT_ACHIEVEMENT_LEVELS = [
  { symbol: '○', label: 'できた', color_class: 'bg-green-100 border-green-500 text-green-600' },
  { symbol: '△', label: 'もう少し', color_class: 'bg-yellow-100 border-yellow-500 text-yellow-600' },
  { symbol: '×', label: 'できなかった', color_class: 'bg-red-100 border-red-500 text-red-600' },
  { symbol: 'A', label: 'アシスト付き', color_class: 'bg-blue-100 border-blue-500 text-blue-600' },
  { symbol: 'E', label: 'エクセレント', color_class: 'bg-purple-100 border-purple-500 text-purple-600' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedDefaultCategories(storeId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i];
      const catResult = await client.query(
        `INSERT INTO training_profile_categories (store_id, name, category_type, goal, display_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [storeId, cat.name, cat.category_type, cat.goal, i]
      );

      // For grid-type category, link existing training_item_masters from '基本トレーニング'
      if (cat.category_type === 'grid') {
        const categoryId = catResult.rows[0].id;
        const items = await client.query(
          `SELECT id FROM training_item_masters
           WHERE store_id = $1 AND category = '基本トレーニング' AND enabled = TRUE
           ORDER BY display_order, id`,
          [storeId]
        );
        for (let j = 0; j < items.rows.length; j++) {
          await client.query(
            `INSERT INTO training_profile_category_items (category_id, training_item_id, display_order)
             VALUES ($1, $2, $3)`,
            [categoryId, items.rows[j].id, j]
          );
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function seedDefaultAchievementLevels(storeId: number): Promise<void> {
  for (let i = 0; i < DEFAULT_ACHIEVEMENT_LEVELS.length; i++) {
    const level = DEFAULT_ACHIEVEMENT_LEVELS[i];
    await pool.query(
      `INSERT INTO training_achievement_levels (store_id, symbol, label, color_class, display_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (store_id, symbol) DO NOTHING`,
      [storeId, level.symbol, level.label, level.color_class, i]
    );
  }
}

async function verifyDogBelongsToStore(dogId: number, storeId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM dogs WHERE id = $1 AND store_id = $2`,
    [dogId, storeId]
  );
  return result.rows.length > 0;
}

// ---------------------------------------------------------------------------
// Category management
// ---------------------------------------------------------------------------

// GET /categories - List categories (lazy init)
router.get('/categories', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;

    // Check if any categories exist
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM training_profile_categories WHERE store_id = $1`,
      [storeId]
    );

    if (parseInt(countResult.rows[0].count) === 0) {
      await seedDefaultCategories(storeId);
    }

    // Fetch categories with their linked items
    const categories = await pool.query(
      `SELECT c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ci.id,
              'training_item_id', ci.training_item_id,
              'display_order', ci.display_order,
              'item_label', tim.item_label,
              'item_key', tim.item_key
            ) ORDER BY ci.display_order, ci.id
          ) FILTER (WHERE ci.id IS NOT NULL),
          '[]'::json
        ) AS items
       FROM training_profile_categories c
       LEFT JOIN training_profile_category_items ci ON ci.category_id = c.id
       LEFT JOIN training_item_masters tim ON tim.id = ci.training_item_id
       WHERE c.store_id = $1
       GROUP BY c.id
       ORDER BY c.display_order, c.id`,
      [storeId]
    );

    res.json(categories.rows);
  } catch (error) {
    sendServerError(res, 'カテゴリ一覧の取得に失敗しました', error);
  }
});

// POST /categories - Create category
router.post('/categories', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { name, category_type, goal, instructions, item_ids } = req.body;

    if (!name || !category_type) {
      return sendBadRequest(res, '名前とカテゴリタイプは必須です');
    }

    if (!['grid', 'log'].includes(category_type)) {
      return sendBadRequest(res, 'カテゴリタイプはgridまたはlogである必要があります');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get max display_order
      const maxOrder = await client.query(
        `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
         FROM training_profile_categories WHERE store_id = $1`,
        [storeId]
      );

      const result = await client.query(
        `INSERT INTO training_profile_categories (store_id, name, category_type, goal, instructions, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [storeId, name, category_type, goal || null, instructions || null, maxOrder.rows[0].next_order]
      );

      const categoryId = result.rows[0].id;

      // Link items for grid type
      if (category_type === 'grid' && Array.isArray(item_ids)) {
        for (let i = 0; i < item_ids.length; i++) {
          await client.query(
            `INSERT INTO training_profile_category_items (category_id, training_item_id, display_order)
             VALUES ($1, $2, $3)`,
            [categoryId, item_ids[i], i]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, 'カテゴリの作成に失敗しました', error);
  }
});

// PUT /categories/reorder - Bulk reorder (must be before /:id)
router.put('/categories/reorder', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendBadRequest(res, 'IDの配列が必要です');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          `UPDATE training_profile_categories
           SET display_order = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND store_id = $3`,
          [i, ids[i], storeId]
        );
      }
      await client.query('COMMIT');
      sendSuccess(res);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, 'カテゴリの並び替えに失敗しました', error);
  }
});

// PUT /categories/:id - Update category
router.put('/categories/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { id } = req.params;
    const { name, goal, instructions, enabled, item_ids } = req.body;

    const check = await pool.query(
      `SELECT id, category_type FROM training_profile_categories WHERE id = $1 AND store_id = $2`,
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'カテゴリが見つかりません');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE training_profile_categories SET
          name = COALESCE($1, name),
          goal = COALESCE($2, goal),
          instructions = COALESCE($3, instructions),
          enabled = COALESCE($4, enabled),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND store_id = $6
         RETURNING *`,
        [name, goal, instructions, enabled, id, storeId]
      );

      // Update linked items for grid type
      if (check.rows[0].category_type === 'grid' && Array.isArray(item_ids)) {
        await client.query(
          `DELETE FROM training_profile_category_items WHERE category_id = $1`,
          [id]
        );
        for (let i = 0; i < item_ids.length; i++) {
          await client.query(
            `INSERT INTO training_profile_category_items (category_id, training_item_id, display_order)
             VALUES ($1, $2, $3)`,
            [id, item_ids[i], i]
          );
        }
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    sendServerError(res, 'カテゴリの更新に失敗しました', error);
  }
});

// DELETE /categories/:id - Delete category
router.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id FROM training_profile_categories WHERE id = $1 AND store_id = $2`,
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'カテゴリが見つかりません');
    }

    await pool.query(`DELETE FROM training_profile_categories WHERE id = $1`, [id]);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'カテゴリの削除に失敗しました', error);
  }
});

// ---------------------------------------------------------------------------
// Achievement levels management
// ---------------------------------------------------------------------------

// GET /achievement-levels - List levels (lazy init)
router.get('/achievement-levels', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM training_achievement_levels WHERE store_id = $1`,
      [storeId]
    );

    if (parseInt(countResult.rows[0].count) === 0) {
      await seedDefaultAchievementLevels(storeId);
    }

    const result = await pool.query(
      `SELECT * FROM training_achievement_levels
       WHERE store_id = $1
       ORDER BY display_order, id`,
      [storeId]
    );

    res.json(result.rows);
  } catch (error) {
    sendServerError(res, '評価段階一覧の取得に失敗しました', error);
  }
});

// POST /achievement-levels - Create level
router.post('/achievement-levels', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { symbol, label, color_class } = req.body;

    if (!symbol || !label) {
      return sendBadRequest(res, '記号とラベルは必須です');
    }

    const maxOrder = await pool.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
       FROM training_achievement_levels WHERE store_id = $1`,
      [storeId]
    );

    const result = await pool.query(
      `INSERT INTO training_achievement_levels (store_id, symbol, label, color_class, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [storeId, symbol, label, color_class || null, maxOrder.rows[0].next_order]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '評価段階の作成に失敗しました', error);
  }
});

// PUT /achievement-levels/:id - Update level
router.put('/achievement-levels/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { id } = req.params;
    const { symbol, label, color_class } = req.body;

    const check = await pool.query(
      `SELECT id FROM training_achievement_levels WHERE id = $1 AND store_id = $2`,
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, '評価段階が見つかりません');
    }

    const result = await pool.query(
      `UPDATE training_achievement_levels SET
        symbol = COALESCE($1, symbol),
        label = COALESCE($2, label),
        color_class = COALESCE($3, color_class),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND store_id = $5
       RETURNING *`,
      [symbol, label, color_class, id, storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '評価段階の更新に失敗しました', error);
  }
});

// DELETE /achievement-levels/:id - Delete level
router.delete('/achievement-levels/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id FROM training_achievement_levels WHERE id = $1 AND store_id = $2`,
      [id, storeId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, '評価段階が見つかりません');
    }

    await pool.query(`DELETE FROM training_achievement_levels WHERE id = $1`, [id]);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, '評価段階の削除に失敗しました', error);
  }
});

// ---------------------------------------------------------------------------
// Dog training data
// ---------------------------------------------------------------------------

// GET /dogs/:dogId/all - Combined fetch
router.get('/dogs/:dogId/all', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    // Ensure defaults are seeded
    const catCount = await pool.query(
      `SELECT COUNT(*) FROM training_profile_categories WHERE store_id = $1`,
      [storeId]
    );
    if (parseInt(catCount.rows[0].count) === 0) {
      await seedDefaultCategories(storeId);
    }

    const levelCount = await pool.query(
      `SELECT COUNT(*) FROM training_achievement_levels WHERE store_id = $1`,
      [storeId]
    );
    if (parseInt(levelCount.rows[0].count) === 0) {
      await seedDefaultAchievementLevels(storeId);
    }

    // Fetch all data in parallel
    const [categories, achievementLevels, gridEntries, logEntries, concerns] = await Promise.all([
      pool.query(
        `SELECT c.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ci.id,
                'training_item_id', ci.training_item_id,
                'display_order', ci.display_order,
                'item_label', tim.item_label,
                'item_key', tim.item_key
              ) ORDER BY ci.display_order, ci.id
            ) FILTER (WHERE ci.id IS NOT NULL),
            '[]'::json
          ) AS items
         FROM training_profile_categories c
         LEFT JOIN training_profile_category_items ci ON ci.category_id = c.id
         LEFT JOIN training_item_masters tim ON tim.id = ci.training_item_id
         WHERE c.store_id = $1
         GROUP BY c.id
         ORDER BY c.display_order, c.id`,
        [storeId]
      ),
      pool.query(
        `SELECT * FROM training_achievement_levels
         WHERE store_id = $1
         ORDER BY display_order, id`,
        [storeId]
      ),
      pool.query(
        `SELECT ge.id, ge.category_id, ge.training_item_id, ge.entry_date,
                ge.achievement_symbol, s.name AS staff_name
         FROM training_profile_grid_entries ge
         LEFT JOIN staff s ON s.id = ge.staff_id
         WHERE ge.store_id = $1 AND ge.dog_id = $2
         ORDER BY ge.entry_date DESC, ge.training_item_id`,
        [storeId, dogId]
      ),
      pool.query(
        `SELECT le.id, le.category_id, le.entry_date, s.name AS staff_name, le.note
         FROM training_profile_log_entries le
         LEFT JOIN staff s ON s.id = le.staff_id
         WHERE le.store_id = $1 AND le.dog_id = $2
         ORDER BY le.entry_date DESC, le.id DESC`,
        [storeId, dogId]
      ),
      pool.query(
        `SELECT c.id, c.entry_date, s.name AS staff_name, c.note
         FROM training_profile_concerns c
         LEFT JOIN staff s ON s.id = c.staff_id
         WHERE c.store_id = $1 AND c.dog_id = $2
         ORDER BY c.entry_date DESC, c.id DESC`,
        [storeId, dogId]
      ),
    ]);

    res.json({
      categories: categories.rows,
      achievementLevels: achievementLevels.rows,
      gridEntries: gridEntries.rows,
      logEntries: logEntries.rows,
      concerns: concerns.rows,
    });
  } catch (error) {
    sendServerError(res, 'トレーニングデータの取得に失敗しました', error);
  }
});

// PUT /dogs/:dogId/grid - Upsert grid entry
router.put('/dogs/:dogId/grid', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { category_id, training_item_id, entry_date, achievement_symbol } = req.body;

    if (!category_id || !training_item_id || !entry_date || !achievement_symbol) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const result = await pool.query(
      `INSERT INTO training_profile_grid_entries
        (store_id, dog_id, category_id, training_item_id, entry_date, achievement_symbol, staff_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (dog_id, category_id, training_item_id, entry_date)
       DO UPDATE SET
        achievement_symbol = EXCLUDED.achievement_symbol,
        staff_id = EXCLUDED.staff_id,
        updated_at = CURRENT_TIMESTAMP
       RETURNING *, (SELECT name FROM staff WHERE id = $7) AS staff_name`,
      [storeId, dogId, category_id, training_item_id, entry_date, achievement_symbol, req.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'グリッドエントリの保存に失敗しました', error);
  }
});

// DELETE /dogs/:dogId/grid/:entryId - Delete grid entry
router.delete('/dogs/:dogId/grid/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { entryId } = req.params;

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const check = await pool.query(
      `SELECT id FROM training_profile_grid_entries
       WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
      [entryId, storeId, dogId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    await pool.query(`DELETE FROM training_profile_grid_entries WHERE id = $1`, [entryId]);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'グリッドエントリの削除に失敗しました', error);
  }
});

// POST /dogs/:dogId/logs - Create log entry
router.post('/dogs/:dogId/logs', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { category_id, entry_date, note } = req.body;

    if (!category_id || !entry_date || !note) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const result = await pool.query(
      `INSERT INTO training_profile_log_entries
        (store_id, dog_id, category_id, entry_date, staff_id, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, (SELECT name FROM staff WHERE id = $5) AS staff_name`,
      [storeId, dogId, category_id, entry_date, req.userId, note]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'ログエントリの作成に失敗しました', error);
  }
});

// PUT /dogs/:dogId/logs/:entryId - Update log entry
router.put('/dogs/:dogId/logs/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { entryId } = req.params;
    const { entry_date, note } = req.body;

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const check = await pool.query(
      `SELECT id FROM training_profile_log_entries
       WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
      [entryId, storeId, dogId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    const result = await pool.query(
      `UPDATE training_profile_log_entries SET
        entry_date = COALESCE($1, entry_date),
        note = COALESCE($2, note),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND store_id = $4
       RETURNING *, (SELECT name FROM staff WHERE id = training_profile_log_entries.staff_id) AS staff_name`,
      [entry_date, note, entryId, storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'ログエントリの更新に失敗しました', error);
  }
});

// DELETE /dogs/:dogId/logs/:entryId - Delete log entry
router.delete('/dogs/:dogId/logs/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { entryId } = req.params;

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const check = await pool.query(
      `SELECT id FROM training_profile_log_entries
       WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
      [entryId, storeId, dogId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    await pool.query(`DELETE FROM training_profile_log_entries WHERE id = $1`, [entryId]);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, 'ログエントリの削除に失敗しました', error);
  }
});

// POST /dogs/:dogId/concerns - Create concern
router.post('/dogs/:dogId/concerns', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { entry_date, note } = req.body;

    if (!entry_date || !note) {
      return sendBadRequest(res, '必須項目が不足しています');
    }

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const result = await pool.query(
      `INSERT INTO training_profile_concerns
        (store_id, dog_id, entry_date, staff_id, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *, (SELECT name FROM staff WHERE id = $4) AS staff_name`,
      [storeId, dogId, entry_date, req.userId, note]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '気になることの作成に失敗しました', error);
  }
});

// PUT /dogs/:dogId/concerns/:entryId - Update concern
router.put('/dogs/:dogId/concerns/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { entryId } = req.params;
    const { entry_date, note } = req.body;

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const check = await pool.query(
      `SELECT id FROM training_profile_concerns
       WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
      [entryId, storeId, dogId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    const result = await pool.query(
      `UPDATE training_profile_concerns SET
        entry_date = COALESCE($1, entry_date),
        note = COALESCE($2, note),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND store_id = $4
       RETURNING *, (SELECT name FROM staff WHERE id = training_profile_concerns.staff_id) AS staff_name`,
      [entry_date, note, entryId, storeId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '気になることの更新に失敗しました', error);
  }
});

// DELETE /dogs/:dogId/concerns/:entryId - Delete concern
router.delete('/dogs/:dogId/concerns/:entryId', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) return;
    const storeId = req.storeId!;
    const dogId = parseInt(req.params.dogId);
    const { entryId } = req.params;

    if (!(await verifyDogBelongsToStore(dogId, storeId))) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const check = await pool.query(
      `SELECT id FROM training_profile_concerns
       WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
      [entryId, storeId, dogId]
    );

    if (check.rows.length === 0) {
      return sendNotFound(res, 'エントリが見つかりません');
    }

    await pool.query(`DELETE FROM training_profile_concerns WHERE id = $1`, [entryId]);
    sendSuccess(res);
  } catch (error) {
    sendServerError(res, '気になることの削除に失敗しました', error);
  }
});

export default router;
