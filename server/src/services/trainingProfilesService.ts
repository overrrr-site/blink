import pool from '../db/connection.js';

export type TrainingProfileCategoryType = 'grid' | 'log';
type TrainingProfileRow = Record<string, unknown>;

const DEFAULT_CATEGORIES = [
  { name: 'コマンド達成状況', category_type: 'grid', goal: null },
  { name: 'フリープレイ', category_type: 'log', goal: '自由にできる空間で、犬と遊ぶもしくは、適度な交流を持ち、人に呼ばれたらスムーズに戻ってくることを目指す' },
  { name: '社会性', category_type: 'log', goal: '人や刺激、犬に対して、吠える、噛む、鼻にしわを寄せる、襲いかかる、飛びつこうとする、遊びを仕掛ける、逃げる行動が見られない' },
  { name: 'トイレトレーニング', category_type: 'log', goal: '排泄環境を整え、安心して、排泄ができるようにする' },
  { name: 'クレートトレーニング', category_type: 'log', goal: '休息の場所や安心できる場所として教え、自ら入ることができるようにする' },
  { name: '散歩', category_type: 'log', goal: '対象物に対して吠えない・凝視しない、引っ張らない、呼べは人に意識を向けられる、フードが食べられる状態を保つことを目指す' },
];

const DEFAULT_ACHIEVEMENT_LEVELS = [
  { symbol: '○', label: '問題なくできる', color_class: 'bg-green-100 border-green-500 text-green-600' },
  { symbol: '△', label: 'もう少し', color_class: 'bg-yellow-100 border-yellow-500 text-yellow-600' },
  { symbol: '×', label: 'できない', color_class: 'bg-red-100 border-red-500 text-red-600' },
  { symbol: 'A', label: '手を追わせる（フードで誘導）', color_class: 'bg-blue-100 border-blue-500 text-blue-600' },
  { symbol: 'B', label: 'ハンドサインを教える', color_class: 'bg-blue-100 border-blue-500 text-blue-600' },
  { symbol: 'C', label: 'コマンド（声符）を教える練習', color_class: 'bg-indigo-100 border-indigo-500 text-indigo-600' },
  { symbol: 'D', label: '言葉のみの練習（プロンプトあり）', color_class: 'bg-violet-100 border-violet-500 text-violet-600' },
  { symbol: 'E', label: '言葉のみでできる', color_class: 'bg-purple-100 border-purple-500 text-purple-600' },
  { symbol: 'F', label: '言葉を聞き分けられる', color_class: 'bg-purple-100 border-purple-500 text-purple-600' },
];

export async function seedDefaultCategories(storeId: number): Promise<void> {
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

      if (cat.category_type === 'grid') {
        const categoryId = catResult.rows[0].id as number;
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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function seedDefaultAchievementLevels(storeId: number): Promise<void> {
  for (let i = 0; i < DEFAULT_ACHIEVEMENT_LEVELS.length; i++) {
    const level = DEFAULT_ACHIEVEMENT_LEVELS[i];
    await pool.query(
      `INSERT INTO training_achievement_levels (store_id, symbol, label, color_class, display_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (store_id, symbol) DO UPDATE SET
         label = EXCLUDED.label,
         color_class = EXCLUDED.color_class,
         display_order = EXCLUDED.display_order`,
      [storeId, level.symbol, level.label, level.color_class, i]
    );
  }
}

export async function verifyDogBelongsToStore(dogId: number, storeId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT d.id
     FROM dogs d
     JOIN owners o ON o.id = d.owner_id
     WHERE d.id = $1 AND o.store_id = $2`,
    [dogId, storeId]
  );
  return result.rows.length > 0;
}

async function countCategories(storeId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) FROM training_profile_categories WHERE store_id = $1`,
    [storeId]
  );
  return Number.parseInt(result.rows[0].count as string, 10);
}

async function countAchievementLevels(storeId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) FROM training_achievement_levels WHERE store_id = $1`,
    [storeId]
  );
  return Number.parseInt(result.rows[0].count as string, 10);
}

export async function ensureDefaultCategories(storeId: number): Promise<void> {
  if ((await countCategories(storeId)) === 0) {
    await seedDefaultCategories(storeId);
  }
}

export async function ensureDefaultAchievementLevels(storeId: number): Promise<void> {
  if ((await countAchievementLevels(storeId)) === 0) {
    await seedDefaultAchievementLevels(storeId);
  }
}

export async function listCategories(storeId: number): Promise<TrainingProfileRow[]> {
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
  return categories.rows as TrainingProfileRow[];
}

export interface CreateCategoryInput {
  storeId: number;
  name: string;
  categoryType: TrainingProfileCategoryType;
  goal?: string | null;
  instructions?: string | null;
  itemIds?: number[] | null;
}

export async function createCategory(input: CreateCategoryInput): Promise<TrainingProfileRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const maxOrder = await client.query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
       FROM training_profile_categories WHERE store_id = $1`,
      [input.storeId]
    );

    const result = await client.query(
      `INSERT INTO training_profile_categories (store_id, name, category_type, goal, instructions, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.storeId,
        input.name,
        input.categoryType,
        input.goal ?? null,
        input.instructions ?? null,
        maxOrder.rows[0].next_order,
      ]
    );

    const categoryId = result.rows[0].id as number;

    if (input.categoryType === 'grid' && Array.isArray(input.itemIds)) {
      for (let i = 0; i < input.itemIds.length; i++) {
        await client.query(
          `INSERT INTO training_profile_category_items (category_id, training_item_id, display_order)
           VALUES ($1, $2, $3)`,
          [categoryId, input.itemIds[i], i]
        );
      }
    }

    await client.query('COMMIT');
    return result.rows[0] as TrainingProfileRow;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function reorderCategories(storeId: number, ids: number[]): Promise<void> {
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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface UpdateCategoryInput {
  storeId: number;
  categoryId: number;
  name?: string | null;
  goal?: string | null;
  instructions?: string | null;
  enabled?: boolean | null;
  itemIds?: number[] | null;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<TrainingProfileRow | null> {
  const check = await pool.query(
    `SELECT id, category_type FROM training_profile_categories WHERE id = $1 AND store_id = $2`,
    [input.categoryId, input.storeId]
  );

  if (check.rows.length === 0) {
    return null;
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
      [input.name, input.goal, input.instructions, input.enabled, input.categoryId, input.storeId]
    );

    if (check.rows[0].category_type === 'grid' && Array.isArray(input.itemIds)) {
      await client.query(
        `DELETE FROM training_profile_category_items WHERE category_id = $1`,
        [input.categoryId]
      );
      for (let i = 0; i < input.itemIds.length; i++) {
        await client.query(
          `INSERT INTO training_profile_category_items (category_id, training_item_id, display_order)
           VALUES ($1, $2, $3)`,
          [input.categoryId, input.itemIds[i], i]
        );
      }
    }

    await client.query('COMMIT');
    return result.rows[0] as TrainingProfileRow;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCategory(storeId: number, categoryId: number): Promise<boolean> {
  const check = await pool.query(
    `SELECT id FROM training_profile_categories WHERE id = $1 AND store_id = $2`,
    [categoryId, storeId]
  );

  if (check.rows.length === 0) {
    return false;
  }

  await pool.query(`DELETE FROM training_profile_categories WHERE id = $1`, [categoryId]);
  return true;
}

export async function listAchievementLevels(storeId: number): Promise<TrainingProfileRow[]> {
  const result = await pool.query(
    `SELECT * FROM training_achievement_levels
     WHERE store_id = $1
     ORDER BY display_order, id`,
    [storeId]
  );
  return result.rows as TrainingProfileRow[];
}

export interface CreateAchievementLevelInput {
  storeId: number;
  symbol: string;
  label: string;
  colorClass?: string | null;
}

export async function createAchievementLevel(input: CreateAchievementLevelInput): Promise<TrainingProfileRow> {
  const maxOrder = await pool.query(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
     FROM training_achievement_levels WHERE store_id = $1`,
    [input.storeId]
  );

  const result = await pool.query(
    `INSERT INTO training_achievement_levels (store_id, symbol, label, color_class, display_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.storeId, input.symbol, input.label, input.colorClass ?? null, maxOrder.rows[0].next_order]
  );

  return result.rows[0] as TrainingProfileRow;
}

export interface UpdateAchievementLevelInput {
  storeId: number;
  levelId: number;
  symbol?: string | null;
  label?: string | null;
  colorClass?: string | null;
}

export async function updateAchievementLevel(input: UpdateAchievementLevelInput): Promise<TrainingProfileRow | null> {
  const check = await pool.query(
    `SELECT id FROM training_achievement_levels WHERE id = $1 AND store_id = $2`,
    [input.levelId, input.storeId]
  );

  if (check.rows.length === 0) {
    return null;
  }

  const result = await pool.query(
    `UPDATE training_achievement_levels SET
      symbol = COALESCE($1, symbol),
      label = COALESCE($2, label),
      color_class = COALESCE($3, color_class),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND store_id = $5
     RETURNING *`,
    [input.symbol, input.label, input.colorClass, input.levelId, input.storeId]
  );

  return result.rows[0] as TrainingProfileRow;
}

export async function deleteAchievementLevel(storeId: number, levelId: number): Promise<boolean> {
  const check = await pool.query(
    `SELECT id FROM training_achievement_levels WHERE id = $1 AND store_id = $2`,
    [levelId, storeId]
  );

  if (check.rows.length === 0) {
    return false;
  }

  await pool.query(`DELETE FROM training_achievement_levels WHERE id = $1`, [levelId]);
  return true;
}

export interface DogTrainingData {
  categories: TrainingProfileRow[];
  achievementLevels: TrainingProfileRow[];
  gridEntries: TrainingProfileRow[];
  logEntries: TrainingProfileRow[];
  concerns: TrainingProfileRow[];
}

export async function getAllDogTrainingData(storeId: number, dogId: number): Promise<DogTrainingData> {
  await ensureDefaultCategories(storeId);
  await ensureDefaultAchievementLevels(storeId);

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

  return {
    categories: categories.rows as TrainingProfileRow[],
    achievementLevels: achievementLevels.rows as TrainingProfileRow[],
    gridEntries: gridEntries.rows as TrainingProfileRow[],
    logEntries: logEntries.rows as TrainingProfileRow[],
    concerns: concerns.rows as TrainingProfileRow[],
  };
}

export interface UpsertGridEntryInput {
  storeId: number;
  dogId: number;
  categoryId: number;
  trainingItemId: number;
  entryDate: string;
  achievementSymbol: string;
  staffId?: number;
}

export async function upsertGridEntry(input: UpsertGridEntryInput): Promise<TrainingProfileRow> {
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
    [
      input.storeId,
      input.dogId,
      input.categoryId,
      input.trainingItemId,
      input.entryDate,
      input.achievementSymbol,
      input.staffId,
    ]
  );
  return result.rows[0] as TrainingProfileRow;
}

export async function hasGridEntry(entryId: number, storeId: number, dogId: number): Promise<boolean> {
  const check = await pool.query(
    `SELECT id FROM training_profile_grid_entries
     WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
    [entryId, storeId, dogId]
  );
  return check.rows.length > 0;
}

export async function deleteGridEntry(entryId: number): Promise<void> {
  await pool.query(`DELETE FROM training_profile_grid_entries WHERE id = $1`, [entryId]);
}

export interface CreateLogEntryInput {
  storeId: number;
  dogId: number;
  categoryId: number;
  entryDate: string;
  staffId?: number;
  note: string;
}

export async function createLogEntry(input: CreateLogEntryInput): Promise<TrainingProfileRow> {
  const result = await pool.query(
    `INSERT INTO training_profile_log_entries
      (store_id, dog_id, category_id, entry_date, staff_id, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *, (SELECT name FROM staff WHERE id = $5) AS staff_name`,
    [input.storeId, input.dogId, input.categoryId, input.entryDate, input.staffId, input.note]
  );
  return result.rows[0] as TrainingProfileRow;
}

export async function hasLogEntry(entryId: number, storeId: number, dogId: number): Promise<boolean> {
  const check = await pool.query(
    `SELECT id FROM training_profile_log_entries
     WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
    [entryId, storeId, dogId]
  );
  return check.rows.length > 0;
}

export interface UpdateLogEntryInput {
  storeId: number;
  entryId: number;
  entryDate?: string | null;
  note?: string | null;
}

export async function updateLogEntry(input: UpdateLogEntryInput): Promise<TrainingProfileRow> {
  const result = await pool.query(
    `UPDATE training_profile_log_entries SET
      entry_date = COALESCE($1, entry_date),
      note = COALESCE($2, note),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND store_id = $4
     RETURNING *, (SELECT name FROM staff WHERE id = training_profile_log_entries.staff_id) AS staff_name`,
    [input.entryDate, input.note, input.entryId, input.storeId]
  );
  return result.rows[0] as TrainingProfileRow;
}

export async function deleteLogEntry(entryId: number): Promise<void> {
  await pool.query(`DELETE FROM training_profile_log_entries WHERE id = $1`, [entryId]);
}

export interface CreateConcernInput {
  storeId: number;
  dogId: number;
  entryDate: string;
  staffId?: number;
  note: string;
}

export async function createConcern(input: CreateConcernInput): Promise<TrainingProfileRow> {
  const result = await pool.query(
    `INSERT INTO training_profile_concerns
      (store_id, dog_id, entry_date, staff_id, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *, (SELECT name FROM staff WHERE id = $4) AS staff_name`,
    [input.storeId, input.dogId, input.entryDate, input.staffId, input.note]
  );
  return result.rows[0] as TrainingProfileRow;
}

export async function hasConcern(entryId: number, storeId: number, dogId: number): Promise<boolean> {
  const check = await pool.query(
    `SELECT id FROM training_profile_concerns
     WHERE id = $1 AND store_id = $2 AND dog_id = $3`,
    [entryId, storeId, dogId]
  );
  return check.rows.length > 0;
}

export interface UpdateConcernInput {
  storeId: number;
  entryId: number;
  entryDate?: string | null;
  note?: string | null;
}

export async function updateConcern(input: UpdateConcernInput): Promise<TrainingProfileRow> {
  const result = await pool.query(
    `UPDATE training_profile_concerns SET
      entry_date = COALESCE($1, entry_date),
      note = COALESCE($2, note),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND store_id = $4
     RETURNING *, (SELECT name FROM staff WHERE id = training_profile_concerns.staff_id) AS staff_name`,
    [input.entryDate, input.note, input.entryId, input.storeId]
  );
  return result.rows[0] as TrainingProfileRow;
}

export async function deleteConcern(entryId: number): Promise<void> {
  await pool.query(`DELETE FROM training_profile_concerns WHERE id = $1`, [entryId]);
}
