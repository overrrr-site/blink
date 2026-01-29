-- LIFF認証: LINE ID による飼い主検索
CREATE INDEX IF NOT EXISTS idx_owners_line_id ON owners(line_id) WHERE line_id IS NOT NULL;

-- LIFF連携: 電話番号による飼い主検索
CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);

-- 日誌一覧: 犬ID + 日付降順の複合インデックス
CREATE INDEX IF NOT EXISTS idx_journals_dog_date_desc ON journals(dog_id, journal_date DESC);

-- お知らせ一覧: 店舗ID + 公開日降順
CREATE INDEX IF NOT EXISTS idx_announcements_store_published ON store_announcements(store_id, published_at DESC) WHERE published_at IS NOT NULL;

-- 認証ミドルウェア: auth_user_id によるスタッフ検索
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 契約検索: 犬IDによる契約検索（LIFF /me で使用）
CREATE INDEX IF NOT EXISTS idx_contracts_dog_id ON contracts(dog_id);
