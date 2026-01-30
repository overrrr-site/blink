-- ごはん記録カラムを追加
-- 形式: [{ "time": "朝8時", "food_name": "ロイカナ", "amount": "50g" }, ...]
ALTER TABLE journals ADD COLUMN IF NOT EXISTS meal_data JSONB;
ALTER TABLE pre_visit_inputs ADD COLUMN IF NOT EXISTS meal_data JSONB;
