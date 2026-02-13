-- 039_training_profiles.sql
-- トレーニングプロフィール機能のテーブル群

-- 1. カテゴリ定義（店舗ごとにカスタマイズ可能）
CREATE TABLE IF NOT EXISTS training_profile_categories (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category_type VARCHAR(10) NOT NULL CHECK (category_type IN ('grid', 'log')),
  goal TEXT,
  instructions TEXT,
  display_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_profile_categories_store
  ON training_profile_categories(store_id);

-- 2. 評価段階（店舗ごとにカスタマイズ可能）
CREATE TABLE IF NOT EXISTS training_achievement_levels (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  label VARCHAR(50) NOT NULL,
  color_class VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_training_achievement_levels_store
  ON training_achievement_levels(store_id);

-- 3. グリッド型カテゴリの項目リンク（training_item_masters を再利用）
CREATE TABLE IF NOT EXISTS training_profile_category_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES training_profile_categories(id) ON DELETE CASCADE,
  training_item_id INTEGER NOT NULL REFERENCES training_item_masters(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(category_id, training_item_id)
);

CREATE INDEX IF NOT EXISTS idx_training_profile_category_items_category
  ON training_profile_category_items(category_id);

-- 4. グリッドエントリ（犬×項目×日付×評価）
CREATE TABLE IF NOT EXISTS training_profile_grid_entries (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES training_profile_categories(id) ON DELETE CASCADE,
  training_item_id INTEGER NOT NULL REFERENCES training_item_masters(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  achievement_symbol VARCHAR(10) NOT NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dog_id, category_id, training_item_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_training_profile_grid_entries_store_dog
  ON training_profile_grid_entries(store_id, dog_id);
CREATE INDEX IF NOT EXISTS idx_training_profile_grid_entries_dog_cat_date
  ON training_profile_grid_entries(dog_id, category_id, entry_date DESC);

-- 5. ログエントリ（犬×カテゴリ×日付×担当×メモ）
CREATE TABLE IF NOT EXISTS training_profile_log_entries (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES training_profile_categories(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_profile_log_entries_store_dog
  ON training_profile_log_entries(store_id, dog_id);
CREATE INDEX IF NOT EXISTS idx_training_profile_log_entries_dog_cat_date
  ON training_profile_log_entries(dog_id, category_id, entry_date DESC);

-- 6. 気になること
CREATE TABLE IF NOT EXISTS training_profile_concerns (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_profile_concerns_store_dog
  ON training_profile_concerns(store_id, dog_id);
