-- ダッシュボード用パフォーマンスインデックス
-- Created: 2026-01-28
-- Description: ダッシュボードAPIの応答時間改善のためのインデックス追加

-- statusカラムへのインデックス（未入力日誌クエリ最適化）
CREATE INDEX IF NOT EXISTS idx_reservations_status
ON reservations(status);

-- 複合インデックス（store_id, status, reservation_date）
-- 未入力日誌クエリで効率的にフィルタリングするため
CREATE INDEX IF NOT EXISTS idx_reservations_store_status_date
ON reservations(store_id, status, reservation_date DESC);
