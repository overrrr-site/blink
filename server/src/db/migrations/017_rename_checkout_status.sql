-- ============================================
-- ステータス名変更: 退園済 → 降園済
-- ============================================

-- 1. すべてのCHECK制約を削除（先に実行）
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
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

-- 2. 既存のデータを新しいステータスに更新
UPDATE reservations SET status = '降園済' WHERE status = '退園済';

-- 3. 新しい制約を追加（退園済 → 降園済）
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('予定', '登園済', '降園済', 'キャンセル'));

-- 4. 確認
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'reservations'::regclass
  AND conname = 'reservations_status_check';
