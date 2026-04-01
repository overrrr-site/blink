import pool from '../db/connection.js';
import {
  saveAILearningData,
  getHighQualityExamples,
  analyzeWritingStyle,
} from '../utils/aiLearning.js';
import {
  callGeminiText,
  callGeminiVision,
  processBase64Image,
} from './ai/gemini.js';
import {
  buildDaycareCommentPrompt,
  buildRecordPhotoPrompt,
  buildActivityPhotoPrompt,
  buildReportPrompt,
} from './ai/prompts.js';
import type { RecordContext } from '../types/recordContext.js';

const TRAINING_LABELS: Record<string, string> = {
  voice_cue: '声かけでプログラム',
  relax_position: 'リラックスポジション',
  house_training: 'ハウストレーニング',
  eye_contact_toilet: 'アイコンタクト',
  disc: 'ディスク',
  ball_catch: 'ボールキャッチ/レット',
  eye_contact: 'アイコンタクト',
  sit: 'オスワリ',
  down: 'フセ',
  stay: 'マテ',
  come: 'オイデ',
  heel: 'ツイテ',
  dog_interaction: '他犬との交流',
  human_interaction: '人慣れ',
  environment: '環境慣れ',
  handling: 'ハンドリング',
  teeth_brushing: '歯磨き練習',
  barking: '吠え対策',
  biting: '噛み対策',
  pulling: '引っ張り対策',
  jumping: '飛びつき対策',
};

const AI_COMMENT_MIN_LENGTH = 150;
const AI_COMMENT_MAX_LENGTH = 250;

function normalizeNarrativeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isWithinNarrativeLength(text: string): boolean {
  return text.length >= AI_COMMENT_MIN_LENGTH && text.length <= AI_COMMENT_MAX_LENGTH;
}

function trimNarrativeText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const sentenceMatches = text.match(/[^。！？\n]+[。！？]?/g) || [];
  let trimmed = '';

  for (const sentence of sentenceMatches) {
    const next = `${trimmed}${sentence}`.trim();
    if (next.length > maxLength) {
      break;
    }
    trimmed = next;
  }

  const candidate = trimmed || text.slice(0, maxLength);
  return candidate.trim();
}

async function rewriteTextToTargetLength(text: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  return callGeminiText({
    prompt: `次の文章の意味を変えずに、自然な日本語で${AI_COMMENT_MIN_LENGTH}〜${AI_COMMENT_MAX_LENGTH}文字に整えてください。文章本文だけを返してください。\n\n${text}`,
    model: 'gemini-3-flash-preview',
    maxOutputTokens: 500,
    temperature: 0.3,
    thinkingBudget: 0,
  });
}

function clampFallbackText(text: string, filler: string): string {
  let normalized = normalizeNarrativeText(text);
  while (normalized.length < AI_COMMENT_MIN_LENGTH) {
    normalized = normalizeNarrativeText(`${normalized}${normalized.endsWith('。') ? '' : '。'}${filler}`);
  }
  return trimNarrativeText(normalized, AI_COMMENT_MAX_LENGTH);
}

async function finalizeNarrativeText(text: string | null | undefined, fallbackText: string): Promise<string> {
  const normalizedFallback = normalizeNarrativeText(fallbackText);
  if (!text) {
    return normalizedFallback;
  }

  const normalized = normalizeNarrativeText(text);
  if (isWithinNarrativeLength(normalized)) {
    return normalized;
  }

  try {
    const rewritten = await rewriteTextToTargetLength(normalized);
    if (rewritten) {
      const normalizedRewrite = normalizeNarrativeText(rewritten);
      if (isWithinNarrativeLength(normalizedRewrite)) {
        return normalizedRewrite;
      }
      if (normalizedRewrite.length > AI_COMMENT_MAX_LENGTH) {
        return trimNarrativeText(normalizedRewrite, AI_COMMENT_MAX_LENGTH);
      }
    }
  } catch (error) {
    console.error('🤖 Gemini rewrite exception:', error);
  }

  if (normalized.length > AI_COMMENT_MAX_LENGTH) {
    return trimNarrativeText(normalized, AI_COMMENT_MAX_LENGTH);
  }

  return normalizedFallback;
}

async function buildStoreStyleHint(
  storeId: number | undefined,
  recordType: 'daycare' | 'grooming' | 'hotel'
): Promise<string> {
  if (!storeId) {
    return '';
  }

  let styleHint = '';
  const writingStyle = await analyzeWritingStyle(storeId, recordType);
  if (writingStyle) {
    const styleDescriptions: string[] = [];
    if (writingStyle.avgLength > 220) {
      styleDescriptions.push('やや詳しく丁寧に');
    } else if (writingStyle.avgLength < 160) {
      styleDescriptions.push('簡潔すぎず自然な長さで');
    }
    if (writingStyle.usesEmoji) {
      styleDescriptions.push('絵文字を適度に使用');
    } else {
      styleDescriptions.push('絵文字は控えめに');
    }
    if (writingStyle.formalLevel === 'casual') {
      styleDescriptions.push('親しみやすい口調で');
    } else if (writingStyle.formalLevel === 'formal') {
      styleDescriptions.push('丁寧な敬語で');
    }
    if (styleDescriptions.length > 0) {
      styleHint = `\n\n【この店舗の好みの文体】\n${styleDescriptions.join('、')}書いてください。`;
    }
  }

  const examples = await getHighQualityExamples(storeId, 'report_generation', recordType, 2);
  if (examples.length > 0) {
    styleHint += '\n\n【参考：この店舗で好評だった過去の文例】\n';
    examples.forEach((ex, i) => {
      styleHint += `例${i + 1}: ${ex.finalText.substring(0, 150)}...\n`;
    });
  }

  return styleHint;
}

function isRemotePhotoUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function resolvePhotoAnalysisInput(input: {
  photo?: string;
  photo_base64?: string;
}): Promise<{ base64Data: string; mimeType: string } | null> {
  if (input.photo_base64) {
    return processBase64Image(input.photo_base64);
  }

  if (!input.photo) {
    return null;
  }

  if (!isRemotePhotoUrl(input.photo)) {
    return processBase64Image(input.photo);
  }

  const response = await fetch(input.photo);
  if (!response.ok) {
    return null;
  }

  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    base64Data: buffer.toString('base64'),
    mimeType,
  };
}

export async function generateDaycareComment(input: {
  dog_name: string;
  training_data?: Record<string, string>;
  morning_toilet?: { urination: boolean; defecation: boolean; location: string };
  afternoon_toilet?: { urination: boolean; defecation: boolean; location: string };
  memo?: string;
  photo_analyses?: string[];
  training_labels?: Record<string, string>;
}, storeId?: number): Promise<string> {
  const {
    dog_name,
    training_data,
    morning_toilet,
    afternoon_toilet,
    memo,
    photo_analyses,
    training_labels,
  } = input;
  const styleHint = await buildStoreStyleHint(storeId, 'daycare');

  const doneItems: string[] = [];
  const almostItems: string[] = [];
  const labels = training_labels || TRAINING_LABELS;

  if (training_data) {
    Object.entries(training_data).forEach(([key, value]) => {
      const label = labels[key] || key;
      if (value === 'done') {
        doneItems.push(label);
      } else if (value === 'almost') {
        almostItems.push(label);
      }
    });
  }

  const prompt = buildDaycareCommentPrompt(
    dog_name,
    doneItems,
    almostItems,
    morning_toilet,
    afternoon_toilet,
    memo,
    photo_analyses,
    styleHint
  );
  const fallbackText = generateTemplateComment(
    dog_name,
    doneItems,
    almostItems,
    morning_toilet,
    afternoon_toilet,
    memo
  );

  try {
    const generatedText = await callGeminiText({
      prompt,
      model: 'gemini-3-flash-preview',
      maxOutputTokens: 500,
      temperature: 0.7,
      thinkingBudget: 0,
    });
    if (generatedText) {
      return finalizeNarrativeText(generatedText, fallbackText);
    }
  } catch (error) {
    console.error('🤖 Gemini API exception:', error);
  }

  return fallbackText;
}

export async function analyzePhotoForRecord(input: {
  record_type: string;
  photo?: string;
  photo_base64?: string;
  dog_name?: string;
}): Promise<{
  analysis: string;
  health_concerns: Array<{ area?: string; issue?: string; severity?: string }>;
  coat_condition?: string;
  overall_health?: string;
  activity?: string;
  mood?: string;
  suggestion: null | {
    type: string;
    message: string;
    actionLabel: string;
    variant: string;
    payload: {
      photoUrl?: string;
      label: string;
      concerns: Array<{ area?: string; issue?: string; severity?: string }>;
    };
  };
}> {
  const { record_type, photo, photo_base64, dog_name } = input;

  if (!process.env.GEMINI_API_KEY) {
    return {
      analysis: '写真を確認しました。',
      health_concerns: [],
      suggestion: null,
    };
  }

  const resolvedPhoto = await resolvePhotoAnalysisInput({ photo, photo_base64 });
  if (!resolvedPhoto) {
    return {
      analysis: '写真を確認しました。',
      health_concerns: [],
      suggestion: null,
    };
  }

  const { base64Data, mimeType } = resolvedPhoto;
  const prompt = buildRecordPhotoPrompt(record_type, dog_name);

  try {
    const rawText = await callGeminiVision({
      prompt,
      model: 'gemini-2.0-flash',
      base64Data,
      mimeType,
      maxOutputTokens: 1000,
      temperature: 0.3,
    });

    let analysisResult: {
      summary?: string;
      concerns?: Array<{ area?: string; issue?: string; severity?: string }>;
      coat_condition?: string;
      overall_health?: string;
      activity?: string;
      mood?: string;
    } = {};
    try {
      const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      }
    } catch {
      analysisResult = { summary: rawText || '写真を確認しました。', concerns: [] };
    }

    let suggestion = null;
    if (analysisResult.concerns && analysisResult.concerns.length > 0) {
      const firstConcern = analysisResult.concerns[0];
      suggestion = {
        type: 'photo-concern',
        message: `${firstConcern.area}に${firstConcern.issue}が見られます`,
        actionLabel: '気になる箇所に追加',
        variant: firstConcern.severity === 'high' ? 'warning' : 'default',
        payload: {
          photoUrl: photo,
          label: `${firstConcern.issue}（AI検出）`,
          concerns: analysisResult.concerns,
        },
      };
    }

    return {
      analysis: analysisResult.summary || '写真を確認しました。',
      health_concerns: analysisResult.concerns || [],
      coat_condition: analysisResult.coat_condition,
      overall_health: analysisResult.overall_health,
      activity: analysisResult.activity,
      mood: analysisResult.mood,
      suggestion,
    };
  } catch (apiError) {
    console.error('Photo analysis API error:', apiError);
    return {
      analysis: '写真を確認しました。',
      health_concerns: [],
      suggestion: null,
    };
  }
}

export async function analyzePhotoForActivity(input: {
  photo?: string;
  photo_base64?: string;
  dog_name?: string;
}): Promise<{
  analysis: string;
  training_suggestions: string[];
  suggested_comment: string;
}> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      analysis: '楽しく遊んでいる様子が伝わりました。',
      training_suggestions: [],
      suggested_comment: '今日も元気いっぱいに過ごしていました。',
    };
  }

  const resolvedPhoto = await resolvePhotoAnalysisInput({
    photo: input.photo,
    photo_base64: input.photo_base64,
  });
  if (!resolvedPhoto) {
    throw new Error('解析用の写真データを取得できませんでした');
  }

  const { base64Data, mimeType } = resolvedPhoto;
  const prompt = buildActivityPhotoPrompt(input.dog_name);

  const responseText = await callGeminiVision({
    prompt,
    model: 'gemini-2.0-flash',
    base64Data,
    mimeType,
    maxOutputTokens: 500,
    temperature: 0.7,
  });

  if (!responseText) {
    throw new Error('解析結果が取得できませんでした');
  }

  const trainingKeywords: Record<string, string[]> = {
    sit: ['オスワリ', '座', 'sit'],
    down: ['フセ', '伏せ', 'down'],
    stay: ['マテ', '待', 'stay'],
    come: ['オイデ', '来', 'come'],
    heel: ['ツイテ', 'ついて', 'heel'],
    dog_interaction: ['他犬', '他の犬', '交流'],
    human_interaction: ['人慣れ', '人'],
  };

  const trainingSuggestions = Object.entries(trainingKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => responseText.includes(keyword)))
    .map(([id]) => id);

  return {
    analysis: responseText,
    training_suggestions: trainingSuggestions,
    suggested_comment: responseText,
  };
}

export async function generateReport(
  input: RecordContext & {
    dog_name: string;
    grooming_data?: { selectedParts?: string[]; partNotes?: Record<string, string> };
    daycare_data?: {
      activities?: string[];
      training?: { items?: Record<string, string> };
      meal?: { morning?: string; afternoon?: string };
      toilet?: Record<string, { urination: boolean; defecation: boolean }>;
    };
    hotel_data?: { nights?: number; special_care?: string };
    condition?: { overall?: string };
    health_check?: { weight?: number; ears?: string; nails?: string; skin?: string; teeth?: string };
    notes?: { internal_notes?: string };
    tone?: 'formal' | 'casual';
  },
  storeId?: number
): Promise<{ report: string; learningDataId: number | null; usedInputs: string[] }>{
  const usedInputs: string[] = [];
  let styleHint = '';
  const regularPhotos =
    input.photos &&
    typeof input.photos === 'object' &&
    'regular' in input.photos &&
    Array.isArray((input.photos as { regular?: unknown }).regular)
      ? (input.photos as { regular: unknown[] }).regular
      : [];

  if (regularPhotos.length > 0) {
    usedInputs.push('photos');
  }
  if (input.condition?.overall) {
    usedInputs.push('condition');
  }
  if (input.health_check && Object.values(input.health_check).some((value) => value !== undefined && value !== null && value !== '')) {
    usedInputs.push('health_check');
  }
  if (input.notes?.internal_notes?.trim()) {
    usedInputs.push('internal_notes');
  }
  if (input.record_type === 'daycare' && input.daycare_data?.activities && input.daycare_data.activities.length > 0) {
    usedInputs.push('daycare_activities');
  }
  if (input.record_type === 'daycare' && input.daycare_data?.training?.items && Object.values(input.daycare_data.training.items).some((v) => v && v !== '')) {
    usedInputs.push('daycare_training');
  }
  if (input.record_type === 'daycare' && (input.daycare_data?.meal?.morning?.trim() || input.daycare_data?.meal?.afternoon?.trim())) {
    usedInputs.push('daycare_meal');
  }
  if (input.record_type === 'daycare' && input.daycare_data?.toilet && Object.values(input.daycare_data.toilet).some((e) => e.urination || e.defecation)) {
    usedInputs.push('daycare_toilet');
  }
  if (input.record_type === 'grooming' && input.grooming_data?.selectedParts && input.grooming_data.selectedParts.length > 0) {
    usedInputs.push('grooming_parts');
  }
  if (
    input.record_type === 'hotel' &&
    input.hotel_data &&
    (input.hotel_data.nights || input.hotel_data.special_care)
  ) {
    usedInputs.push('hotel_stay');
  }

  styleHint = await buildStoreStyleHint(
    storeId,
    input.record_type as 'daycare' | 'grooming' | 'hotel'
  );

  // 写真分析（最大2枚）
  let photoAnalysisHint = '';
  if (regularPhotos.length > 0 && process.env.GEMINI_API_KEY) {
    const photoUrls = regularPhotos
      .slice(0, 1)
      .map((p: { url?: string }) => p.url)
      .filter(Boolean) as string[];

    const analyses: string[] = [];
    for (const url of photoUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const buffer = Buffer.from(await response.arrayBuffer());
        const base64 = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64WithPrefix = `data:${contentType};base64,${base64}`;
        const result = await analyzePhotoForRecord({
          record_type: input.record_type,
          photo_base64: base64WithPrefix,
          dog_name: input.dog_name,
        });
        if (result.analysis && result.analysis !== '写真を確認しました。') {
          analyses.push(result.analysis);
        }
      } catch {
        // 写真分析失敗は無視して続行
      }
    }
    if (analyses.length > 0) {
      photoAnalysisHint = `\n\n【写真から読み取れた様子】\n${analyses.map((a) => `・${a}`).join('\n')}`;
    }
  }

  const prompt = buildReportPrompt(input.record_type, input.dog_name, {
    grooming_data: input.grooming_data,
    daycare_data: input.daycare_data,
    hotel_data: input.hotel_data,
    condition: input.condition,
    health_check: input.health_check,
    notes: input.notes,
    photoAnalyses: photoAnalysisHint,
  }, input.tone || 'formal', styleHint);

  try {
    const reportText = await callGeminiText({
      prompt,
      model: 'gemini-3-flash-preview',
      maxOutputTokens: 600,
      temperature: 0.7,
      thinkingBudget: 0,
    });

    if (reportText) {
      const finalizedReport = await finalizeNarrativeText(
        reportText,
        generateReportFallback(input.record_type, input.dog_name)
      );
      let learningDataId: number | null = null;
      if (storeId) {
        learningDataId = await saveAILearningData({
          storeId,
          dataType: 'report_generation',
          inputContext: {
            grooming_data: input.grooming_data,
            daycare_data: input.daycare_data,
            hotel_data: input.hotel_data,
            condition: input.condition,
            health_check: input.health_check,
          },
          aiOutput: finalizedReport,
          recordType: input.record_type as 'daycare' | 'grooming' | 'hotel',
        });
      }

      return { report: finalizedReport, learningDataId, usedInputs };
    }
  } catch (apiError) {
    console.error('Gemini API error for generate-report:', apiError);
  }

  return { report: generateReportFallback(input.record_type, input.dog_name), learningDataId: null, usedInputs };
}

function generateTemplateComment(
  dogName: string,
  doneItems: string[],
  almostItems: string[],
  morningToilet: { urination: boolean; defecation: boolean; location: string } | undefined,
  afternoonToilet: { urination: boolean; defecation: boolean; location: string } | undefined,
  memo?: string
): string {
  const detailParts: string[] = [];
  if (memo && memo.trim()) {
    detailParts.push(memo.trim());
  }
  if (doneItems.length > 0) {
    detailParts.push(
      doneItems.length === 1
        ? `${doneItems[0]}にも前向きに取り組み、落ち着いて行動できる場面が見られました`
        : `${doneItems.slice(0, 3).join('、')}などに前向きに取り組み、できることが少しずつ増えてきています`
    );
  }
  if (almostItems.length > 0) {
    detailParts.push(
      `${almostItems.slice(0, 2).join('、')}もスタッフと一緒に練習しながら、次につながる良い動きが見られました`
    );
  }
  const toiletSuccess = (morningToilet?.urination || morningToilet?.defecation)
    || (afternoonToilet?.urination || afternoonToilet?.defecation);
  if (toiletSuccess) {
    detailParts.push('園内でのトイレも無理なくできており、安心して過ごせていた様子です');
  }

  const baseText = `${dogName}ちゃんは今日も元気に登園し、スタッフや周りの環境に慣れながら穏やかに過ごしてくれました。${detailParts.join('。')}。これからもその子らしいペースを大切にしながら、楽しく成長をサポートしてまいります。`;
  return clampFallbackText(
    baseText,
    `次回も${dogName}ちゃんが安心して過ごせるよう、できたことをしっかり褒めながら丁寧に関わっていきます。`
  );
}

function generateReportFallback(recordType: string, dogName: string): string {
  if (recordType === 'grooming') {
    return clampFallbackText(
      `今日の${dogName}ちゃんは落ち着いてトリミングを頑張ってくれました。施術中もスタッフの声かけによく応えてくれ、仕上がりもすっきり整っています。おうちではブラッシングを続けていただくと、毛並みをきれいに保ちやすくなります。`,
      `次回も${dogName}ちゃんが安心して施術を受けられるよう、様子を見ながら丁寧にお預かりいたします。`
    );
  }
  if (recordType === 'hotel') {
    return clampFallbackText(
      `今回の${dogName}ちゃんは滞在中も落ち着いて過ごし、お食事やお散歩にも無理なく参加できていました。スタッフのそばでも安心した様子が見られ、リラックスして宿泊できていた印象です。`,
      `お迎えまで穏やかに過ごしてくれていましたので、どうぞご安心ください。またのご利用をお待ちしております。`
    );
  }
  return clampFallbackText(
    `今日の${dogName}ちゃんは元気に登園し、お友達との時間やスタッフとの関わりを楽しみながら過ごしてくれました。園内でも落ち着いた場面が増え、できることを一つずつ頑張る姿が見られました。`,
    `お食事やトイレも大きな問題なく過ごせており、これからの成長も楽しみです。次回も元気に会えるのを楽しみにしています。`
  );
}

export async function fetchTrainingLabels(storeId: number): Promise<Record<string, string>> {
  const labelResult = await pool.query(
    'SELECT item_key, item_label FROM training_item_masters WHERE store_id = $1 AND enabled = true',
    [storeId]
  );
  const customLabels: Record<string, string> = {};
  labelResult.rows.forEach((row: { item_key: string; item_label: string }) => {
    customLabels[row.item_key] = row.item_label;
  });
  return customLabels;
}
