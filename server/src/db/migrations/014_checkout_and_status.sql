-- checked_out_atカラムを追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- ステータス制約を更新（旧ステータスを新ステータスに移行）
-- 既存の「チェックイン済」を「登園済」に更新
UPDATE reservations SET status = '登園済' WHERE status = 'チェックイン済';

-- ステータス制約の更新
-- まず、すべての既存のCHECK制約を削除（制約名が異なる可能性があるため）
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- reservationsテーブルのstatusカラムに関するCHECK制約をすべて検索して削除
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'reservations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE reservations DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
  END LOOP;
END $$;

-- 新しい制約を追加
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('予定', '登園済', '退園済', 'キャンセル'));
