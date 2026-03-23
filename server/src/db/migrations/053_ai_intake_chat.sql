-- 053: AIチャット形式 初回カルテ（インテーク）機能
-- 飼い主がLIFFでAIチャットに答えることで犬の性格・健康情報を自動カルテ化

-- チャットセッション管理
CREATE TABLE IF NOT EXISTS ai_intake_sessions (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_phase INTEGER NOT NULL DEFAULT 1,
  current_question INTEGER NOT NULL DEFAULT 1,
  structured_data JSONB DEFAULT '{}',
  ai_summary TEXT,
  education_plan JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_intake_sessions_dog ON ai_intake_sessions(dog_id);
CREATE INDEX IF NOT EXISTS idx_ai_intake_sessions_owner ON ai_intake_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_ai_intake_sessions_status ON ai_intake_sessions(dog_id, status);

-- チャット履歴
CREATE TABLE IF NOT EXISTS ai_intake_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES ai_intake_sessions(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('assistant', 'user')),
  content TEXT NOT NULL,
  phase INTEGER,
  question_key VARCHAR(50),
  choice_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_intake_messages_session ON ai_intake_messages(session_id);
