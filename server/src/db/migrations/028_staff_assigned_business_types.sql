-- スタッフに業種割り当てカラムを追加
-- NULL = 全業種アクセス可（管理者/オーナー）
-- TEXT[] = 割り当てられた業種のみアクセス可

ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_business_types TEXT[] DEFAULT NULL;

-- コメント追加
COMMENT ON COLUMN staff.assigned_business_types IS 'スタッフが担当する業種。NULLの場合は全業種アクセス可（管理者）。値がある場合はその業種のみ表示可能。';
