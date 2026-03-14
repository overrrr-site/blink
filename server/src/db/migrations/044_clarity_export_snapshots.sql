-- 044_clarity_export_snapshots.sql
-- Microsoft Clarity Data Export API の生レスポンスを保存

CREATE TABLE IF NOT EXISTS clarity_export_snapshots (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'project-live-insights',
  num_of_days INTEGER NOT NULL CHECK (num_of_days BETWEEN 1 AND 3),
  dimension1 TEXT,
  dimension2 TEXT,
  dimension3 TEXT,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clarity_export_snapshots_fetched_at_idx
  ON clarity_export_snapshots(fetched_at DESC);

