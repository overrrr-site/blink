-- 生活の様子: 排泄環境を複数選択化し、その他気になることを追加

ALTER TABLE dog_lifestyles
  ADD COLUMN IF NOT EXISTS toilet_environments TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

ALTER TABLE dog_lifestyles
  ADD COLUMN IF NOT EXISTS other_concerns TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dog_lifestyles'
      AND column_name = 'toilet_environment'
  ) THEN
    UPDATE dog_lifestyles
    SET toilet_environments = ARRAY[toilet_environment]
    WHERE toilet_environment IS NOT NULL
      AND toilet_environment <> ''
      AND cardinality(toilet_environments) = 0;

    ALTER TABLE dog_lifestyles DROP COLUMN toilet_environment;
  END IF;
END $$;

COMMENT ON TABLE dog_lifestyles IS '犬の生活の様子（B-4, B-5, B-13〜B-18, その他気になること）';
COMMENT ON COLUMN dog_lifestyles.toilet_environments IS '排泄環境（複数）: sheet_only/tray_with_mesh/tray_no_mesh/outside';
COMMENT ON COLUMN dog_lifestyles.other_concerns IS '生活の様子でその他気になること';
