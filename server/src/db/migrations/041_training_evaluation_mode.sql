-- トレーニング評価モード設定

-- training_item_masters に評価タイプとメモ有無カラムを追加
ALTER TABLE training_item_masters ADD COLUMN IF NOT EXISTS evaluation_type VARCHAR(20) DEFAULT 'simple';
ALTER TABLE training_item_masters ADD COLUMN IF NOT EXISTS has_note BOOLEAN DEFAULT FALSE;

-- store_settings にトレーニング評価モード設定を追加
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS training_evaluation_mode VARCHAR(20) DEFAULT 'three_step';
