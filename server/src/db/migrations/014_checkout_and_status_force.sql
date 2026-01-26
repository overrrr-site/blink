-- ============================================
-- ステータス制約の強制更新
-- ============================================

-- 1. checked_out_atカラムを追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- 2. 既存のデータを新しいステータスに更新
UPDATE reservations SET status = '登園済' WHERE status = 'チェックイン済';

-- 3. すべてのCHECK制約を強制的に削除（制約名を直接指定）
-- よくある制約名をすべて試す
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_check;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS check_reservations_status;

-- 4. より確実な方法：すべてのCHECK制約を削除
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- reservationsテーブルのすべてのCHECK制約を取得して削除
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'reservations'::regclass
      AND contype = 'c'
  LOOP
    BEGIN
      EXECUTE 'ALTER TABLE reservations DROP CONSTRAINT ' || quote_ident(constraint_record.conname);
      RAISE NOTICE '削除した制約: %', constraint_record.conname;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '制約削除エラー (無視): % - %', constraint_record.conname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 5. 新しい制約を追加
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('予定', '登園済', '退園済', 'キャンセル'));

-- 6. 確認：制約が正しく追加されたか確認
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'reservations'::regclass
  AND conname = 'reservations_status_check';
