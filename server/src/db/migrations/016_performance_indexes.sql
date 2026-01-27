-- Performance optimization indexes
-- Created: 2026-01-27

-- 予約テーブル複合インデックス（日付範囲検索の高速化）
CREATE INDEX IF NOT EXISTS idx_reservations_store_date
ON reservations(store_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_dog_date
ON reservations(dog_id, reservation_date DESC);

-- 契約テーブルインデックス（有効期間検索用）
CREATE INDEX IF NOT EXISTS idx_contracts_dog_period
ON contracts(dog_id, valid_until);

-- 日誌テーブルインデックス
CREATE INDEX IF NOT EXISTS idx_journals_reservation
ON journals(reservation_id);

-- 犬健康情報インデックス（ワクチン期限アラート用）
CREATE INDEX IF NOT EXISTS idx_dog_health_vaccines
ON dog_health(mixed_vaccine_date, rabies_vaccine_date);

-- 登園前入力テーブルインデックス
CREATE INDEX IF NOT EXISTS idx_pre_visit_inputs_reservation
ON pre_visit_inputs(reservation_id);
