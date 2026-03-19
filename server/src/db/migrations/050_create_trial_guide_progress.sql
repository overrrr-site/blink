-- 050_create_trial_guide_progress.sql
-- トライアルガイドの進捗管理（Progressive Disclosure制御）

CREATE TABLE IF NOT EXISTS trial_guide_progress (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_key VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_trial_guide_store_id ON trial_guide_progress(store_id);

COMMENT ON TABLE trial_guide_progress IS 'トライアルガイドの進捗（Progressive Disclosure制御）';
COMMENT ON COLUMN trial_guide_progress.step_number IS 'ステップ順序（1〜5）';
COMMENT ON COLUMN trial_guide_progress.unlocked_at IS 'このステップが解放された日時（NULLなら未解放）';
COMMENT ON COLUMN trial_guide_progress.completed_at IS 'このステップが完了した日時（NULLなら未完了）';
