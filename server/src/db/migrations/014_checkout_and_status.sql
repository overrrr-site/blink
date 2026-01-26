-- checked_out_atカラムを追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE;

-- ステータス制約を更新（旧ステータスを新ステータスに移行）
-- 既存の「チェックイン済」を「登園済」に更新
UPDATE reservations SET status = '登園済' WHERE status = 'チェックイン済';

-- ステータス制約の更新（PostgreSQLではALTER COLUMN SETで直接変更できないのでDROP/ADDで対応）
-- 注意: 本番環境では事前にデータのバックアップを取ってください
DO $$
BEGIN
  -- 既存の制約があれば削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_status_check'
  ) THEN
    ALTER TABLE reservations DROP CONSTRAINT reservations_status_check;
  END IF;
  
  -- 新しい制約を追加
  ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
    CHECK (status IN ('予定', '登園済', '退園済', 'キャンセル'));
END $$;
