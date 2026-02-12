-- 飼い主向けお知らせ既読管理
CREATE TABLE IF NOT EXISTS owner_announcement_reads (
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  announcement_id INTEGER NOT NULL REFERENCES store_announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_announcement_reads_owner_read_at
  ON owner_announcement_reads(owner_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_announcement_reads_announcement
  ON owner_announcement_reads(announcement_id);
