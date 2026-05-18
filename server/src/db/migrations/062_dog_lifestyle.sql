-- 犬「生活の様子」セクション新設（ベータレポート対応 B-4, B-5, B-13〜B-18）
-- 全店舗共通の固定項目で実装

CREATE TABLE IF NOT EXISTS dog_lifestyles (
  dog_id INTEGER PRIMARY KEY REFERENCES dogs(id) ON DELETE CASCADE,

  -- B-4 ほめ言葉の種類（複数選択）: ['iiko','good','other']
  praise_words TEXT[] NOT NULL DEFAULT '{}',
  praise_words_other TEXT,

  -- B-5 トイレの合図（複数選択）: ['wantsu','toilet','other']
  toilet_signal TEXT[] NOT NULL DEFAULT '{}',
  toilet_signal_other TEXT,

  -- B-13 休息場所の環境（複数選択）: ['circle','bed_only','crate','none']
  rest_environments TEXT[] NOT NULL DEFAULT '{}',

  -- B-14 排泄環境（単一）: 'sheet_only' | 'tray_with_mesh' | 'tray_no_mesh' | 'outside'
  toilet_environment TEXT,

  -- B-15 排泄のしつけ（複数選択）: ['voluntary','on_command','many_failures']
  toilet_training TEXT[] NOT NULL DEFAULT '{}',

  -- B-16 排泄回数
  urination_count_per_day INTEGER,
  defecation_count_per_day INTEGER,
  toilet_timing_notes TEXT,

  -- B-17 昼食
  has_lunch BOOLEAN NOT NULL DEFAULT FALSE,
  lunch_time TIME,

  -- B-18 おやつ使用経験（複数選択）: ['kong_paste','churu','k9_natural','cheese','other','none']
  treat_experience TEXT[] NOT NULL DEFAULT '{}',
  treat_other_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dog_lifestyles IS '犬の生活の様子（B-4, B-5, B-13〜B-18）';
COMMENT ON COLUMN dog_lifestyles.praise_words IS 'ほめ言葉の種類（複数）: iiko/good/other';
COMMENT ON COLUMN dog_lifestyles.toilet_signal IS 'トイレの合図（複数）: wantsu/toilet/other';
COMMENT ON COLUMN dog_lifestyles.rest_environments IS '休息場所（複数）: circle/bed_only/crate/none';
COMMENT ON COLUMN dog_lifestyles.toilet_environment IS '排泄環境（単一）';
COMMENT ON COLUMN dog_lifestyles.toilet_training IS '排泄のしつけ（複数）';
COMMENT ON COLUMN dog_lifestyles.treat_experience IS 'おやつ使用経験（複数）';
