import pg from 'pg';
import { callGeminiText } from './gemini.js';

// ============================================================
// 型定義
// ============================================================

export interface IntakeQuestion {
  key: string;
  phase: number;
  content: string;
  type: 'single_choice' | 'multi_choice' | 'text';
  choices?: { label: string; value: string }[];
  allowOther?: boolean;
  allowSupplementText?: boolean;
  skippable?: boolean;
  followUp?: {
    triggerValues: string[];
    content: string;
    type: 'text';
  };
}

export interface IntakeSession {
  id: number;
  dog_id: number;
  current_phase: number;
  current_question: number;
  status: string;
  structured_data: Record<string, unknown>;
  pending_follow_up?: boolean;
}

interface IntakeAnswer {
  question_key: string;
  values?: string[];
  text?: string;
  is_follow_up?: boolean;
}

interface IntakeSummaryResult {
  personality: {
    personality_description: string;
    dog_compatibility: string;
    likes: string;
    dislikes: string;
    biting_habit: string;
    biting_habit_detail: string;
    toilet_status: string;
  };
  health: {
    allergies: string;
    medical_history: string;
    medications: string;
  };
  trainer_summary: string;
  education_plan: {
    daycare_plan: string;
    home_advice: string;
    three_month_goals: string;
  };
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  question_key?: string;
}

// ============================================================
// 質問定義（10問・4フェーズ）
// ============================================================

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  // フェーズ1: 性格・社会性
  {
    key: 'personality',
    phase: 1,
    content: '{dogName}ちゃんの性格を教えてください（複数選べます）',
    type: 'multi_choice',
    choices: [
      { label: '甘えん坊', value: 'clingy' },
      { label: '元気いっぱい', value: 'energetic' },
      { label: 'おっとり', value: 'calm' },
      { label: '怖がり', value: 'fearful' },
      { label: 'マイペース', value: 'independent' },
      { label: '頑固', value: 'stubborn' },
    ],
    allowSupplementText: true,
  },
  {
    key: 'dog_reaction',
    phase: 1,
    content: '{dogName}ちゃんは他のワンちゃんと会ったとき、どんな反応をしますか？',
    type: 'single_choice',
    choices: [
      { label: '喜んで遊ぶ', value: 'friendly' },
      { label: '普通', value: 'neutral' },
      { label: '怖がる', value: 'fearful' },
      { label: '吠える・威嚇する', value: 'aggressive' },
    ],
    allowSupplementText: true,
  },
  {
    key: 'favorites',
    phase: 1,
    content: '{dogName}ちゃんの好きな遊びやごほうびは何ですか？（複数選べます）',
    type: 'multi_choice',
    choices: [
      { label: 'おやつ', value: 'treats' },
      { label: 'おもちゃ・ボール', value: 'toys' },
      { label: '引っ張りっこ', value: 'tug' },
      { label: '撫でられること', value: 'petting' },
      { label: '走り回ること', value: 'running' },
    ],
    allowOther: true,
  },

  // フェーズ2: 行動の注意点
  {
    key: 'biting',
    phase: 2,
    content: '{dogName}ちゃんに噛み癖はありますか？',
    type: 'single_choice',
    choices: [
      { label: 'なし', value: 'none' },
      { label: '甘噛み程度', value: 'gentle' },
      { label: 'あり', value: 'yes' },
    ],
    followUp: {
      triggerValues: ['gentle', 'yes'],
      content: 'どんなときに噛むことがありますか？教えてください。',
      type: 'text',
    },
  },
  {
    key: 'dislikes',
    phase: 2,
    content: '{dogName}ちゃんの苦手なことはありますか？（複数選べます）',
    type: 'multi_choice',
    choices: [
      { label: '大きな音', value: 'loud_noise' },
      { label: '体を触られること', value: 'touching' },
      { label: '知らない人', value: 'strangers' },
      { label: '知らない犬', value: 'unknown_dogs' },
      { label: '車・乗り物', value: 'vehicles' },
      { label: '特になし', value: 'none' },
    ],
    allowOther: true,
  },
  {
    key: 'resource_guarding',
    phase: 2,
    content: '{dogName}ちゃんは、おもちゃやフードを取られそうになったとき、守ろうとしますか？',
    type: 'single_choice',
    choices: [
      { label: 'しない', value: 'none' },
      { label: '少し気にする', value: 'mild' },
      { label: '唸る・守る', value: 'guarding' },
    ],
  },

  // フェーズ3: 健康・生活
  {
    key: 'health_info',
    phase: 3,
    content: '{dogName}ちゃんのアレルギー・持病・服用中のお薬があれば教えてください。特になければ「特になし」とお答えください。',
    type: 'text',
  },
  {
    key: 'toilet',
    phase: 3,
    content: '{dogName}ちゃんのトイレの状況を教えてください。',
    type: 'single_choice',
    choices: [
      { label: '完璧', value: 'perfect' },
      { label: 'ほぼOK', value: 'mostly_ok' },
      { label: 'トレーニング中', value: 'training' },
    ],
  },
  {
    key: 'separation',
    phase: 3,
    content: '{dogName}ちゃんはお留守番のとき、どんな様子ですか？',
    type: 'single_choice',
    choices: [
      { label: '落ち着いている', value: 'calm' },
      { label: '少し寂しがる', value: 'mild_anxiety' },
      { label: '吠えたり鳴いたりする', value: 'barking' },
      { label: 'パニックになる', value: 'panic' },
    ],
  },

  // フェーズ4: 相談
  {
    key: 'concerns',
    phase: 4,
    content: '{dogName}ちゃんについて、困っていることや相談したいことはありますか？なければスキップできます。',
    type: 'text',
    skippable: true,
  },
];

// ============================================================
// getNextQuestion
// ============================================================

export function getNextQuestion(
  session: IntakeSession,
  lastAnswer?: IntakeAnswer
): IntakeQuestion | { isFollowUp: true; content: string; type: 'text'; parentKey: string } | null {
  // フォローアップが必要か判定
  if (lastAnswer && !lastAnswer.is_follow_up) {
    const currentQ = INTAKE_QUESTIONS.find((q) => q.key === lastAnswer.question_key);
    if (currentQ?.followUp && lastAnswer.values) {
      const needsFollowUp = lastAnswer.values.some((v) =>
        currentQ.followUp!.triggerValues.includes(v)
      );
      if (needsFollowUp) {
        return {
          isFollowUp: true,
          content: currentQ.followUp.content,
          type: currentQ.followUp.type,
          parentKey: currentQ.key,
        };
      }
    }
  }

  // 次の質問を探す
  const currentIndex = lastAnswer
    ? INTAKE_QUESTIONS.findIndex((q) => q.key === lastAnswer.question_key)
    : -1;

  const nextIndex = currentIndex + 1;
  if (nextIndex >= INTAKE_QUESTIONS.length) {
    return null;
  }

  return INTAKE_QUESTIONS[nextIndex];
}

// ============================================================
// formatQuestionMessage
// ============================================================

export function formatQuestionMessage(
  question: IntakeQuestion | { isFollowUp: true; content: string; type: 'text'; parentKey: string },
  dogName: string
): string {
  const replaceName = (text: string) => text.replace(/\{dogName\}/g, dogName);

  // フォローアップ質問
  if ('isFollowUp' in question) {
    return replaceName(question.content);
  }

  let message = replaceName(question.content);

  // 選択肢の表示
  if (question.choices && question.choices.length > 0) {
    const choiceList = question.choices
      .map((c, i) => `${i + 1}. ${c.label}`)
      .join('\n');
    message += '\n\n' + choiceList;

    if (question.type === 'multi_choice') {
      message += '\n\n(複数選択できます)';
    }
  }

  if (question.allowOther) {
    message += '\n\nその他があれば自由に書いてください。';
  }

  if (question.allowSupplementText) {
    message += '\n\n補足があれば自由に書き添えてください。';
  }

  if (question.skippable) {
    message += '\n\n(スキップする場合は「スキップ」と送ってください)';
  }

  return message;
}

// ============================================================
// summarizeIntake
// ============================================================

export async function summarizeIntake(
  messages: ChatMessage[],
  dogName: string
): Promise<IntakeSummaryResult | null> {
  const conversationText = messages
    .map((m) => `${m.role === 'assistant' ? 'AI' : '飼い主'}: ${m.content}`)
    .join('\n');

  const prompt = `あなたは犬の幼稚園・保育園のベテラントレーナーです。
飼い主とのインテーク（初回カルテ）チャットの内容を分析し、以下の情報を抽出してJSON形式で出力してください。

犬の名前: ${dogName}

【会話内容】
${conversationText}

以下のJSON形式で回答してください。JSON以外のテキストは一切出力しないでください。

{
  "personality": {
    "personality_description": "性格の要約（100字程度。甘えん坊、元気いっぱい等のキーワードと補足を自然な文章で）",
    "dog_compatibility": "良好 / 普通 / 苦手 / 要注意 のいずれか",
    "likes": "好きな遊び・ごほうび（カンマ区切り）",
    "dislikes": "苦手なこと（カンマ区切り。特になしの場合は空文字）",
    "biting_habit": "なし / 軽度 / あり のいずれか",
    "biting_habit_detail": "噛み癖の詳細（ない場合は空文字）",
    "toilet_status": "完璧 / ほぼOK / トレーニング中 のいずれか"
  },
  "health": {
    "allergies": "アレルギー情報（特になしの場合は空文字）",
    "medical_history": "持病の情報（特になしの場合は空文字）",
    "medications": "服用中の薬（特になしの場合は空文字）"
  },
  "trainer_summary": "トレーナー向けの要約レポート（200字程度。性格、注意点、健康面、飼い主の相談内容を簡潔にまとめる）",
  "education_plan": {
    "daycare_plan": "園でのおすすめの過ごし方（100字程度。この犬に合った活動提案）",
    "home_advice": "家庭でのワンポイントアドバイス（100字程度）",
    "three_month_goals": "3ヶ月後の目標（100字程度。社会性・トレーニング面での成長目標）"
  }
}`;

  try {
    const result = await callGeminiText({
      prompt,
      model: 'gemini-2.0-flash',
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    if (!result) {
      console.error('[error] summarizeIntake: Gemini APIの応答がありません');
      return null;
    }

    // JSONブロックの抽出（```json ... ``` 対応）
    let jsonStr = result.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as IntakeSummaryResult;
    return parsed;
  } catch (err) {
    console.error('[error] summarizeIntake: 要約の生成に失敗しました', err);
    return null;
  }
}

// ============================================================
// saveIntakeResults
// ============================================================

export async function saveIntakeResults(
  pool: pg.Pool,
  sessionId: number,
  structuredData: IntakeSummaryResult,
  dogId: number
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // dog_personality テーブルに INSERT or UPDATE
    const personalityMap = buildPersonalityDbValues(structuredData.personality);
    await client.query(
      `INSERT INTO dog_personality (dog_id, personality_description, dog_compatibility, likes, dislikes, biting_habit, biting_habit_detail, toilet_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (dog_id)
       DO UPDATE SET
         personality_description = EXCLUDED.personality_description,
         dog_compatibility = EXCLUDED.dog_compatibility,
         likes = EXCLUDED.likes,
         dislikes = EXCLUDED.dislikes,
         biting_habit = EXCLUDED.biting_habit,
         biting_habit_detail = EXCLUDED.biting_habit_detail,
         toilet_status = EXCLUDED.toilet_status,
         updated_at = NOW()`,
      [
        dogId,
        personalityMap.personality_description,
        personalityMap.dog_compatibility,
        personalityMap.likes,
        personalityMap.dislikes,
        personalityMap.biting_habit,
        personalityMap.biting_habit_detail,
        personalityMap.toilet_status,
      ]
    );

    // dog_health テーブルに INSERT or UPDATE（アレルギー・持病・薬）
    await client.query(
      `INSERT INTO dog_health (dog_id, allergies, medical_history, medications, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (dog_id)
       DO UPDATE SET
         allergies = EXCLUDED.allergies,
         medical_history = EXCLUDED.medical_history,
         medications = EXCLUDED.medications,
         updated_at = NOW()`,
      [
        dogId,
        structuredData.health.allergies || null,
        structuredData.health.medical_history || null,
        structuredData.health.medications || null,
      ]
    );

    // ai_intake_sessions の structured_data, ai_summary, education_plan を更新
    await client.query(
      `UPDATE ai_intake_sessions
       SET structured_data = $1,
           ai_summary = $2,
           education_plan = $3,
           status = 'completed',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [
        JSON.stringify(structuredData),
        structuredData.trainer_summary,
        JSON.stringify(structuredData.education_plan),
        sessionId,
      ]
    );

    await client.query('COMMIT');
    console.log(`[info] saveIntakeResults: session=${sessionId}, dog=${dogId} 保存完了`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[error] saveIntakeResults: 保存に失敗しました', err);
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// ヘルパー
// ============================================================

/** Gemini出力の personality オブジェクトを DB カラム値にマッピング */
function buildPersonalityDbValues(p: IntakeSummaryResult['personality']) {
  // dog_compatibility: DB の CHECK 制約に合わせる
  const compatibilityMap: Record<string, string> = {
    '良好': '良好',
    '普通': '普通',
    '苦手': '苦手',
    '要注意': '要注意',
  };

  // biting_habit: DB の CHECK 制約に合わせる
  const bitingMap: Record<string, string> = {
    'なし': 'なし',
    '軽度': '軽度',
    'あり': 'あり',
  };

  // toilet_status: DB の CHECK 制約に合わせる
  const toiletMap: Record<string, string> = {
    '完璧': '完璧',
    'ほぼOK': 'ほぼOK',
    'トレーニング中': 'トレーニング中',
  };

  return {
    personality_description: p.personality_description || null,
    dog_compatibility: compatibilityMap[p.dog_compatibility] || '普通',
    likes: p.likes || null,
    dislikes: p.dislikes || null,
    biting_habit: bitingMap[p.biting_habit] || 'なし',
    biting_habit_detail: p.biting_habit_detail || null,
    toilet_status: toiletMap[p.toilet_status] || 'ほぼOK',
  };
}
