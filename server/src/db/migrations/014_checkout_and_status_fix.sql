-- ============================================
-- ステータス制約の更新（修正版）
-- ============================================

-- 1. 現在の制約を確認（実行前に確認用）
-- SELECT conname, pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'reservations'::regclass
--   AND contype = 'c';

-- 2. checked_out_atカラムを追加（まだ追加されていない場合）
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- 3. 既存のデータを新しいステータスに更新
UPDATE reservations SET status = '登園済' WHERE status = 'チェックイン済';

-- 4. すべてのCHECK制約を削除（statusカラムに関連するもの）
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
      RAISE NOTICE '削除した制約: %', constraint_record.conname;
    END IF;
  END LOOP;
END $$;

-- 5. 新しい制約を追加
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('予定', '登園済', '退園済', 'キャンセル'));

-- 6. 制約が正しく追加されたか確認
-- SELECT conname, pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'reservations'::regclass
--   AND conname = 'reservations_status_check';
