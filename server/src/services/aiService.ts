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

export async function generateDaycareComment(input: {
  dog_name: string;
  training_data?: Record<string, string>;
  morning_toilet?: { urination: boolean; defecation: boolean; location: string };
  afternoon_toilet?: { urination: boolean; defecation: boolean; location: string };
  memo?: string;
  photo_analyses?: string[];
  training_labels?: Record<string, string>;
}): Promise<string> {
  const {
    dog_name,
    training_data,
    morning_toilet,
    afternoon_toilet,
    memo,
    photo_analyses,
    training_labels,
  } = input;

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
    photo_analyses
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
      return generatedText;
    }
  } catch (error) {
    console.error('🤖 Gemini API exception:', error);
  }

  return generateTemplateComment(
    dog_name,
    doneItems,
    almostItems,
    morning_toilet,
    afternoon_toilet,
    memo
  );
}

export async function analyzePhotoForRecord(input: {
  record_type: string;
  photo?: string;
  photo_base64?: string;
  dog_name?: string;
}): Promise<{
  analysis: string;
  health_concerns: any[];
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
      concerns: any[];
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

  let imageBase64 = photo_base64;
  if (!imageBase64 && photo) {
    return {
      analysis: '写真を確認しました。',
      health_concerns: [],
      suggestion: null,
    };
  }

  const { base64Data, mimeType } = processBase64Image(imageBase64);
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

    let analysisResult: any = {};
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
  photo_base64: string;
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

  const { base64Data, mimeType } = processBase64Image(input.photo_base64);
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

export async function generateReport(input: {
  record_type: string;
  dog_name: string;
  grooming_data?: { selectedParts?: string[]; partNotes?: Record<string, string> };
  daycare_data?: { activities?: string[] };
  hotel_data?: { nights?: number; special_care?: string };
  condition?: { overall?: string };
  health_check?: { weight?: number; ears?: string; nails?: string; skin?: string; teeth?: string };
  notes?: { internal_notes?: string };
}, storeId?: number): Promise<{ report: string; learningDataId: number | null }>{
  let styleHint = '';

  if (storeId) {
    const writingStyle = await analyzeWritingStyle(storeId, input.record_type);
    if (writingStyle) {
      const styleDescriptions: string[] = [];
      if (writingStyle.avgLength > 300) {
        styleDescriptions.push('詳しく丁寧に');
      } else if (writingStyle.avgLength < 150) {
        styleDescriptions.push('簡潔に');
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

    const examples = await getHighQualityExamples(storeId, 'report_generation', input.record_type, 2);
    if (examples.length > 0) {
      styleHint += '\n\n【参考：この店舗で好評だった過去のレポート例】\n';
      examples.forEach((ex, i) => {
        styleHint += `例${i + 1}: ${ex.finalText.substring(0, 150)}...\n`;
      });
    }
  }

  const prompt = buildReportPrompt(input.record_type, input.dog_name, {
    grooming_data: input.grooming_data,
    daycare_data: input.daycare_data,
    hotel_data: input.hotel_data,
    condition: input.condition,
    health_check: input.health_check,
    notes: input.notes,
  }, styleHint);

  try {
    const reportText = await callGeminiText({
      prompt,
      model: 'gemini-3-flash-preview',
      maxOutputTokens: 600,
      temperature: 0.7,
      thinkingBudget: 0,
    });

    if (reportText) {
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
          aiOutput: reportText,
          recordType: input.record_type as 'daycare' | 'grooming' | 'hotel',
        });
      }

      return { report: reportText, learningDataId };
    }
  } catch (apiError) {
    console.error('Gemini API error for generate-report:', apiError);
  }

  return { report: generateReportFallback(input.record_type, input.dog_name), learningDataId: null };
}

function generateTemplateComment(
  dogName: string,
  doneItems: string[],
  almostItems: string[],
  morningToilet: { urination: boolean; defecation: boolean; location: string } | undefined,
  afternoonToilet: { urination: boolean; defecation: boolean; location: string } | undefined,
  memo?: string
): string {
  const parts: string[] = [];

  const greetings = [
    `今日も${dogName}ちゃん、元気いっぱいでした！`,
    `${dogName}ちゃん、今日も頑張りました！`,
    `本日の${dogName}ちゃんの様子をお伝えします。`,
  ];
  parts.push(greetings[Math.floor(Math.random() * greetings.length)]);

  if (memo && memo.trim()) {
    parts.push(memo.trim());
  }

  if (doneItems.length > 0) {
    if (doneItems.length === 1) {
      parts.push(`${doneItems[0]}がバッチリできました！`);
    } else if (doneItems.length <= 3) {
      parts.push(`${doneItems.join('、')}ができました。`);
    } else {
      parts.push(`${doneItems.slice(0, 3).join('、')}など、${doneItems.length}項目ができました！`);
    }
  }

  if (almostItems.length > 0) {
    if (almostItems.length === 1) {
      parts.push(`${almostItems[0]}はもう少しで完璧になりそうです。`);
    } else {
      parts.push(`${almostItems.slice(0, 2).join('、')}は引き続き練習していきます。`);
    }
  }

  const toiletSuccess = (morningToilet?.urination || morningToilet?.defecation) ||
                       (afternoonToilet?.urination || afternoonToilet?.defecation);
  if (toiletSuccess) {
    parts.push('トイレも上手にできていました。');
  }

  const closings = [
    'また次回も楽しみにしています！',
    '次回も一緒に頑張りましょう！',
    '引き続きよろしくお願いします。',
  ];
  parts.push(closings[Math.floor(Math.random() * closings.length)]);

  return parts.join('\n');
}

function generateReportFallback(recordType: string, dogName: string): string {
  if (recordType === 'grooming') {
    return `${dogName}ちゃんのトリミングが完了しました！今日もとてもお利口にしてくれました。仕上がりもバッチリです。お家でのブラッシングも続けていただけると、キレイな状態を保てます。次回のご予約もお待ちしております。`;
  }
  if (recordType === 'hotel') {
    return `${dogName}ちゃんの滞在中、リラックスして過ごしてくれました。お食事もしっかり食べて、お散歩も楽しんでいました。とても穏やかに過ごしていましたのでご安心ください。またのご利用をお待ちしております。`;
  }
  return `${dogName}ちゃん、今日も元気いっぱいでした！お友達と仲良く遊んで、トレーニングも頑張りました。次回も楽しみにしています！`;
}

export async function fetchTrainingLabels(storeId: number): Promise<Record<string, string>> {
  const labelResult = await pool.query(
    'SELECT item_key, item_label FROM training_masters WHERE store_id = $1 AND enabled = true',
    [storeId]
  );
  const customLabels: Record<string, string> = {};
  labelResult.rows.forEach((row: any) => {
    customLabels[row.item_key] = row.item_label;
  });
  return customLabels;
}
