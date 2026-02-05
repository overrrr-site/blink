/**
 * AI学習データの収集・活用ユーティリティ
 *
 * ai_store_data_contribution: 店舗内でのAI学習データ蓄積
 * ai_service_improvement: サービス全体の改善のためのデータ活用
 */

import pool from '../db/connection.js';

export type AIDataType = 'report_generation' | 'photo_analysis' | 'suggestion_feedback';

export interface AILearningInput {
  storeId: number;
  dataType: AIDataType;
  inputContext: Record<string, unknown>;
  aiOutput: string;
  recordType?: 'daycare' | 'grooming' | 'hotel';
}

export interface AIFeedbackInput {
  learningDataId: number;
  wasUsed: boolean;
  wasEdited: boolean;
  finalText?: string;
}

/**
 * 店舗のAI設定を取得
 */
export async function getAISettings(storeId: number): Promise<{
  aiAssistantEnabled: boolean;
  aiStoreDataContribution: boolean;
  aiServiceImprovement: boolean;
}> {
  const result = await pool.query(
    `SELECT
       ai_assistant_enabled,
       ai_store_data_contribution,
       ai_service_improvement
     FROM store_settings
     WHERE store_id = $1`,
    [storeId]
  );

  if (result.rows.length === 0) {
    return {
      aiAssistantEnabled: true,
      aiStoreDataContribution: true,
      aiServiceImprovement: false,
    };
  }

  return {
    aiAssistantEnabled: result.rows[0].ai_assistant_enabled ?? true,
    aiStoreDataContribution: result.rows[0].ai_store_data_contribution ?? true,
    aiServiceImprovement: result.rows[0].ai_service_improvement ?? false,
  };
}

/**
 * 入力コンテキストから個人情報を除去して匿名化
 */
function anonymizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const anonymized = { ...context };

  // 犬名を除去
  if ('dog_name' in anonymized) {
    anonymized.dog_name = '[DOG_NAME]';
  }
  if ('dogName' in anonymized) {
    anonymized.dogName = '[DOG_NAME]';
  }

  // 飼い主名を除去
  if ('owner_name' in anonymized) {
    anonymized.owner_name = '[OWNER_NAME]';
  }
  if ('ownerName' in anonymized) {
    anonymized.ownerName = '[OWNER_NAME]';
  }

  // スタッフメモから固有名詞的な情報を削除（完全除去は難しいため、存在有無のみ記録）
  if ('memo' in anonymized && typeof anonymized.memo === 'string' && anonymized.memo.length > 0) {
    anonymized.memo = `[MEMO_EXISTS:${anonymized.memo.length}chars]`;
  }
  if ('notes' in anonymized && typeof anonymized.notes === 'string' && anonymized.notes.length > 0) {
    anonymized.notes = `[NOTES_EXISTS:${anonymized.notes.length}chars]`;
  }

  // 写真URLを除去
  if ('photo' in anonymized) {
    anonymized.photo = '[PHOTO_EXISTS]';
  }
  if ('photo_base64' in anonymized) {
    anonymized.photo_base64 = '[PHOTO_BASE64_EXISTS]';
  }

  return anonymized;
}

/**
 * AI出力テキストから固有名詞を除去して匿名化
 */
function anonymizeOutput(output: string): string {
  // 犬名パターン（○○ちゃん、○○くん）を除去
  // 注: 完全な匿名化は難しいため、主要なパターンのみ対応
  return output
    .replace(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]+(?:ちゃん|くん|さん)/g, '[NAME]')
    .replace(/[\w]+(?:ちゃん|くん|さん)/g, '[NAME]');
}

/**
 * AI学習データを保存
 * ai_store_data_contributionがtrueの場合のみ保存
 */
export async function saveAILearningData(input: AILearningInput): Promise<number | null> {
  const settings = await getAISettings(input.storeId);

  if (!settings.aiStoreDataContribution) {
    return null;
  }

  const anonymizedContext = anonymizeContext(input.inputContext);
  const anonymizedOutput = anonymizeOutput(input.aiOutput);

  const result = await pool.query(
    `INSERT INTO ai_learning_data
       (store_id, data_type, input_context, ai_output, record_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.storeId,
      input.dataType,
      JSON.stringify(anonymizedContext),
      anonymizedOutput,
      input.recordType || null,
    ]
  );

  return result.rows[0].id;
}

/**
 * AI学習データにフィードバックを記録
 */
export async function recordAIFeedback(input: AIFeedbackInput): Promise<void> {
  // 品質スコアを計算
  // - 使用された場合: 0.5
  // - 使用されて編集されなかった場合: 1.0
  // - 使用されて編集された場合: 0.7
  // - 使用されなかった場合: 0.2
  let qualityScore = 0.2;
  if (input.wasUsed) {
    qualityScore = input.wasEdited ? 0.7 : 1.0;
  }

  const anonymizedFinalText = input.finalText
    ? anonymizeOutput(input.finalText)
    : null;

  await pool.query(
    `UPDATE ai_learning_data
     SET was_used = $1, was_edited = $2, final_text = $3, quality_score = $4
     WHERE id = $5`,
    [input.wasUsed, input.wasEdited, anonymizedFinalText, qualityScore, input.learningDataId]
  );
}

/**
 * 店舗の過去の高品質な出力パターンを取得
 * レポート生成時のプロンプト改善に活用
 */
export async function getHighQualityExamples(
  storeId: number,
  dataType: AIDataType,
  recordType?: string,
  limit: number = 3
): Promise<Array<{ inputContext: Record<string, unknown>; aiOutput: string; finalText: string }>> {
  const settings = await getAISettings(storeId);

  if (!settings.aiStoreDataContribution) {
    return [];
  }

  let query = `
    SELECT input_context, ai_output, final_text
    FROM ai_learning_data
    WHERE store_id = $1
      AND data_type = $2
      AND quality_score >= 0.7
      AND was_used = true
  `;
  const params: (number | string)[] = [storeId, dataType];

  if (recordType) {
    query += ` AND record_type = $3`;
    params.push(recordType);
  }

  query += ` ORDER BY quality_score DESC, created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);

  return result.rows.map((row: { input_context: Record<string, unknown>; ai_output: string; final_text: string | null }) => ({
    inputContext: row.input_context,
    aiOutput: row.ai_output,
    finalText: row.final_text || row.ai_output,
  }));
}

/**
 * 店舗の好みの文体パターンを分析
 */
export async function analyzeWritingStyle(
  storeId: number,
  recordType?: string
): Promise<{
  avgLength: number;
  usesEmoji: boolean;
  formalLevel: 'casual' | 'formal' | 'mixed';
} | null> {
  const settings = await getAISettings(storeId);

  if (!settings.aiStoreDataContribution) {
    return null;
  }

  let query = `
    SELECT final_text
    FROM ai_learning_data
    WHERE store_id = $1
      AND data_type = 'report_generation'
      AND was_used = true
      AND final_text IS NOT NULL
  `;
  const params: (number | string)[] = [storeId];

  if (recordType) {
    query += ` AND record_type = $2`;
    params.push(recordType);
  }

  query += ` ORDER BY created_at DESC LIMIT 20`;

  const result = await pool.query(query, params);

  if (result.rows.length < 3) {
    return null; // 十分なデータがない
  }

  const texts: string[] = result.rows.map((row: { final_text: string }) => row.final_text);

  // 平均文字数
  const avgLength = Math.round(texts.reduce((sum, t) => sum + t.length, 0) / texts.length);

  // 絵文字使用率
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
  const emojiCount = texts.filter(t => emojiPattern.test(t)).length;
  const usesEmoji = emojiCount > texts.length * 0.3;

  // フォーマルレベル（簡易判定）
  const casualPatterns = /です！|ました！|ね！|よ！|かな/;
  const formalPatterns = /ございます|いたします|存じます/;
  const casualCount = texts.filter(t => casualPatterns.test(t)).length;
  const formalCount = texts.filter(t => formalPatterns.test(t)).length;

  let formalLevel: 'casual' | 'formal' | 'mixed' = 'mixed';
  if (casualCount > formalCount * 2) {
    formalLevel = 'casual';
  } else if (formalCount > casualCount * 2) {
    formalLevel = 'formal';
  }

  return { avgLength, usesEmoji, formalLevel };
}

/**
 * サジェスションのフィードバックを記録
 */
export async function recordSuggestionFeedback(
  storeId: number,
  suggestionType: string,
  wasApplied: boolean,
  recordType?: string
): Promise<void> {
  const settings = await getAISettings(storeId);

  if (!settings.aiStoreDataContribution) {
    return;
  }

  await pool.query(
    `INSERT INTO ai_learning_data
       (store_id, data_type, input_context, ai_output, was_used, record_type, quality_score)
     VALUES ($1, 'suggestion_feedback', $2, $3, $4, $5, $6)`,
    [
      storeId,
      JSON.stringify({ suggestion_type: suggestionType }),
      suggestionType,
      wasApplied,
      recordType || null,
      wasApplied ? 1.0 : 0.2,
    ]
  );
}
