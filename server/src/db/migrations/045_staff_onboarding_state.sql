-- オンボーディング状態をスタッフごとに管理するJSONBカラムを追加
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB
    DEFAULT '{"role":null,"setup":{"line":"not_started","google_calendar":"not_started"},"completedHints":[],"dismissed":false,"firstLoginAt":null}';
