# RAG（Retrieval-Augmented Generation）実装計画

## 概要
店舗ごとにベクトルデータベースを活用した高精度なAI学習システム。
過去のレポートを意味的に検索し、より適切なコンテキストを提供する。

---

## 現在の実装 vs RAG実装

| 項目 | 現在のシンプル方式 | RAG方式 |
|------|-------------------|---------|
| 検索方式 | 品質スコア順 | 意味的類似度 |
| 精度 | 中程度 | 高い |
| インフラ | PostgreSQL | PostgreSQL + pgvector |
| コスト | 低い | 中程度（埋め込み生成） |
| 実装難易度 | 簡単 | やや複雑 |

---

## RAGアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      レポート生成フロー                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ユーザーがカルテ情報を入力                                │
│                ↓                                            │
│  2. 入力データからクエリベクトルを生成                        │
│     └─ Gemini Embedding API                                │
│                ↓                                            │
│  3. 類似レポートを検索（pgvector）                           │
│     └─ 品質スコア0.7以上 + コサイン類似度上位3件             │
│                ↓                                            │
│  4. 検索結果をプロンプトに注入                               │
│     └─ 「参考例」として過去の優良レポートを提示              │
│                ↓                                            │
│  5. Gemini APIでレポート生成                                │
│                ↓                                            │
│  6. 生成されたレポートを埋め込み化して保存                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## データベース設計

### 1. pgvectorの有効化

```sql
-- Supabaseではダッシュボードから有効化
-- または SQL で
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. `ai_embeddings` テーブル

```sql
CREATE TABLE ai_embeddings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  learning_data_id INTEGER REFERENCES ai_learning_data(id) ON DELETE CASCADE,

  -- 埋め込みベクトル（Gemini Embedding は 768次元）
  embedding vector(768) NOT NULL,

  -- メタデータ（検索フィルタ用）
  record_type VARCHAR(20),
  data_type VARCHAR(50),
  quality_score DECIMAL(3,2),

  -- 元テキスト（デバッグ用）
  source_text TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス（IVFFlat方式、高速検索用）
CREATE INDEX idx_ai_embeddings_vector ON ai_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- フィルタ用インデックス
CREATE INDEX idx_ai_embeddings_store ON ai_embeddings(store_id);
CREATE INDEX idx_ai_embeddings_record_type ON ai_embeddings(record_type);
CREATE INDEX idx_ai_embeddings_quality ON ai_embeddings(quality_score);
```

---

## 埋め込み生成

### Gemini Embedding API

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }]
        }
      })
    }
  );

  const data = await response.json();
  return data.embedding.values; // 768次元のベクトル
}
```

---

## 類似検索

### PostgreSQL + pgvector

```typescript
async function findSimilarReports(
  storeId: number,
  queryEmbedding: number[],
  recordType: string,
  limit: number = 3
): Promise<SimilarReport[]> {
  const result = await pool.query(`
    SELECT
      e.id,
      e.source_text,
      ld.final_text,
      ld.quality_score,
      1 - (e.embedding <=> $1::vector) as similarity
    FROM ai_embeddings e
    JOIN ai_learning_data ld ON ld.id = e.learning_data_id
    WHERE e.store_id = $2
      AND e.record_type = $3
      AND ld.quality_score >= 0.7
      AND ld.was_used = true
    ORDER BY e.embedding <=> $1::vector
    LIMIT $4
  `, [
    JSON.stringify(queryEmbedding),
    storeId,
    recordType,
    limit
  ]);

  return result.rows;
}
```

---

## 入力データのベクトル化

レポート生成リクエスト時、入力データを文章化してベクトル化：

```typescript
function buildQueryText(data: RecordInput): string {
  const parts: string[] = [];

  if (data.record_type === 'grooming') {
    parts.push(`業種: グルーミング`);
    if (data.grooming_data?.selectedParts) {
      parts.push(`施術部位: ${data.grooming_data.selectedParts.join(', ')}`);
    }
    if (data.health_check) {
      const checks = Object.entries(data.health_check)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);
      parts.push(`健康チェック: ${checks.join(', ')}`);
    }
  }

  if (data.record_type === 'daycare') {
    parts.push(`業種: 幼稚園`);
    if (data.daycare_data?.activities) {
      parts.push(`活動: ${data.daycare_data.activities.join(', ')}`);
    }
  }

  if (data.record_type === 'hotel') {
    parts.push(`業種: ホテル`);
    if (data.hotel_data?.nights) {
      parts.push(`滞在日数: ${data.hotel_data.nights}泊`);
    }
  }

  if (data.condition?.overall) {
    parts.push(`体調: ${data.condition.overall}`);
  }

  return parts.join('\n');
}
```

---

## 実装フェーズ

### Phase 1: 基盤整備（1-2日）
- [ ] pgvectorエクステンションの有効化
- [ ] `ai_embeddings`テーブル作成
- [ ] 埋め込み生成関数の実装

### Phase 2: データ蓄積（2-3日）
- [ ] 既存の高品質レポートをベクトル化
- [ ] 新規レポート生成時の自動ベクトル化
- [ ] バッチ処理スクリプト作成

### Phase 3: 検索統合（2-3日）
- [ ] 類似検索関数の実装
- [ ] レポート生成フローへの統合
- [ ] プロンプトテンプレートの調整

### Phase 4: 最適化（1-2日）
- [ ] インデックスチューニング
- [ ] キャッシュ戦略の検討
- [ ] パフォーマンステスト

---

## コスト見積もり

| 項目 | 単価 | 月間見積もり |
|------|------|-------------|
| Gemini Embedding API | $0.00025 / 1K文字 | ~$5（10万文字） |
| pgvectorストレージ | Supabaseプランに含む | $0 |

---

## 代替案: OpenAI Embedding

Geminiの代わりにOpenAI Embeddingも使用可能：

```typescript
async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // 1536次元
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

※ OpenAI使用時は`ai_embeddings.embedding`を`vector(1536)`に変更

---

## モニタリング

### 検索品質の指標

```sql
-- 検索結果の平均類似度
SELECT
  AVG(1 - (e.embedding <=> query_embedding)) as avg_similarity,
  COUNT(*) as total_searches
FROM ai_search_logs;

-- 品質スコア別の検索ヒット率
SELECT
  CASE
    WHEN quality_score >= 0.9 THEN 'excellent'
    WHEN quality_score >= 0.7 THEN 'good'
    ELSE 'fair'
  END as quality_tier,
  COUNT(*) as count
FROM ai_embeddings
GROUP BY quality_tier;
```

---

## セキュリティ考慮

1. **テナント分離**: `store_id`で完全分離、他店舗のデータは検索不可
2. **匿名化維持**: ベクトル化前に匿名化処理を適用
3. **アクセス制御**: RLSポリシーでstore_idベースの制限

---

## 実装ステータス: 📋 計画段階

現在は「シンプルな学習システム」で運用中。
ユーザー数増加・データ蓄積後にRAG方式へ移行予定。
