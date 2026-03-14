-- 043_ux_analytics.sql
-- UX分析イベントとレポートジョブ管理

CREATE TABLE IF NOT EXISTS ux_report_jobs (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  session_count INTEGER NOT NULL CHECK (session_count > 0),
  session_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_path TEXT,
  summary JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ux_events (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  staff_id_hash TEXT NOT NULL,
  flow TEXT NOT NULL CHECK (flow IN ('reservation', 'record')),
  event_name TEXT NOT NULL CHECK (
    event_name IN ('route_view', 'cta_click', 'form_error', 'submit_success', 'submit_fail', 'api_slow')
  ),
  step TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_job_id BIGINT REFERENCES ux_report_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ux_events_flow_event_created_idx
  ON ux_events(flow, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS ux_events_session_id_idx
  ON ux_events(session_id);

CREATE INDEX IF NOT EXISTS ux_events_store_report_idx
  ON ux_events(store_id, report_job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ux_report_jobs_status_created_idx
  ON ux_report_jobs(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_report_jobs_single_active_per_store_idx
  ON ux_report_jobs(store_id)
  WHERE status IN ('pending', 'running');

