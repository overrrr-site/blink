-- AI学習データテーブル
-- 店舗のAI機能改善のためのデータを蓄積

CREATE TABLE IF NOT EXISTS ai_learning_data (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- データの種類
  data_type VARCHAR(50) NOT NULL, -- 'report_generation', 'photo_analysis', 'suggestion_feedback'

  -- 入力データ（匿名化済み）
  input_context JSONB, -- AIへの入力コンテキスト（犬名などは除去）

  -- 出力データ
  ai_output TEXT, -- AIの生成結果

  -- ユーザーフィードバック
  was_used BOOLEAN DEFAULT NULL, -- ユーザーが実際に使用したか
  was_edited BOOLEAN DEFAULT NULL, -- ユーザーが編集したか
  final_text TEXT, -- ユーザーが最終的に使用したテキスト

  -- メタデータ
  record_type VARCHAR(20), -- 'daycare', 'grooming', 'hotel'
  quality_score DECIMAL(3,2), -- 品質スコア（0.00-1.00）

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_ai_learning_data_store_id ON ai_learning_data(store_id);
CREATE INDEX idx_ai_learning_data_type ON ai_learning_data(data_type);
CREATE INDEX idx_ai_learning_data_record_type ON ai_learning_data(record_type);
CREATE INDEX idx_ai_learning_data_quality ON ai_learning_data(quality_score) WHERE quality_score IS NOT NULL;

-- コメント
COMMENT ON TABLE ai_learning_data IS 'AI機能改善のための学習データ。店舗のai_store_data_contributionがtrueの場合のみ蓄積';
COMMENT ON COLUMN ai_learning_data.data_type IS 'データの種類: report_generation（レポート生成）, photo_analysis（写真解析）, suggestion_feedback（サジェスション）';
COMMENT ON COLUMN ai_learning_data.input_context IS '匿名化された入力コンテキスト。犬名や個人情報は含まない';
COMMENT ON COLUMN ai_learning_data.was_used IS 'ユーザーがAI出力を使用したかどうか';
COMMENT ON COLUMN ai_learning_data.was_edited IS 'ユーザーがAI出力を編集したかどうか';
COMMENT ON COLUMN ai_learning_data.quality_score IS '品質スコア。was_used=true かつ was_edited=false なら高スコア';
