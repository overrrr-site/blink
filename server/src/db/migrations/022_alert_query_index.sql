-- ダッシュボードのアラートクエリ高速化用インデックス
-- dogs.owner_id + deleted_at フィルタ用（部分インデックス）
CREATE INDEX IF NOT EXISTS idx_dogs_owner_active
  ON dogs(owner_id) WHERE deleted_at IS NULL;

-- owners.store_id は既存の idx_owners_store_id でカバー済み
