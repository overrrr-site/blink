-- プランテーブル
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'standard', 'pro'
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  max_dogs INTEGER, -- NULL = 無制限
  features JSONB, -- 機能リスト
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 店舗のプラン情報
ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payjp_customer_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payjp_subscription_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive'; -- 'active', 'inactive', 'canceled', 'past_due'
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_end_date DATE;

-- 請求履歴テーブル
CREATE TABLE IF NOT EXISTS billing_history (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES plans(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'JPY',
  payjp_charge_id VARCHAR(255),
  payjp_subscription_id VARCHAR(255),
  billing_period_start DATE,
  billing_period_end DATE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_billing_history_store_id ON billing_history(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);

-- デフォルトプランの作成
INSERT INTO plans (name, display_name, price_monthly, max_dogs, features) VALUES
  ('free', 'フリープラン', 0, 20, '{"ai_limit": true, "support": "email"}'::jsonb),
  ('standard', 'スタンダードプラン', 5500, 100, '{"ai_limit": false, "support": "priority"}'::jsonb),
  ('pro', 'プロプラン', 11000, NULL, '{"ai_limit": false, "support": "priority", "multi_store": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;
