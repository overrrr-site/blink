-- checked_out_atカラムを追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- ステータス制約を更新（旧ステータスを新ステータスに移行）
-- 既存の「チェックイン済」を「登園済」に更新
UPDATE reservations SET status = '登園済' WHERE status = 'チェックイン済';

-- ステータス制約の更新
-- まず、すべての既存のCHECK制約を削除（制約名が異なる可能性があるため）
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- reservationsテーブルのすべてのCHECK制約を取得
  FOR constraint_record IN
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'reservations'::regclass
      AND contype = 'c'
  LOOP
    -- statusカラムに関連する制約を削除
    IF constraint_record.definition LIKE '%status%' THEN
      EXECUTE 'ALTER TABLE reservations DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
    END IF;
  END LOOP;
END $$;

-- 新しい制約を追加
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('予定', '登園済', '退園済', 'キャンセル'));
