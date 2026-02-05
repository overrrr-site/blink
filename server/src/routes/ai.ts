import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendBadRequest, sendServerError } from '../utils/response.js';
import pool from '../db/connection.js';
import {
  saveAILearningData,
  recordAIFeedback,
  getHighQualityExamples,
  analyzeWritingStyle,
  recordSuggestionFeedback,
  getAISettings,
} from '../utils/aiLearning.js';

const router = express.Router();
router.use(authenticate);

// トレーニング項目のラベルマッピング
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

function extractGeminiText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const candidatesValue = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidatesValue) || candidatesValue.length === 0) {
    return '';
  }

  const firstCandidate = candidatesValue[0];
  if (!firstCandidate || typeof firstCandidate !== 'object') {
    return '';
  }

  const contentValue = (firstCandidate as { content?: unknown }).content;
  if (!contentValue || typeof contentValue !== 'object') {
    return '';
  }

  const partsValue = (contentValue as { parts?: unknown }).parts;
  if (!Array.isArray(partsValue) || partsValue.length === 0) {
    return '';
  }

  const firstPart = partsValue[0];
  if (!firstPart || typeof firstPart !== 'object') {
    return '';
  }

  const textValue = (firstPart as { text?: unknown }).text;
  return typeof textValue === 'string' ? textValue : '';
}

// 日誌コメント生成
router.post('/generate-comment', async (req: AuthRequest, res) => {
  console.log('🤖 /generate-comment エンドポイント到達');
  console.log('🤖 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  try {
    const {
      dog_name,
      training_data,
      morning_toilet,
      afternoon_toilet,
      memo,              // スタッフのメモ書き（新規追加）
      photo_analyses,    // 写真解析結果の配列（新規追加）
      training_labels,   // カスタムトレーニングラベル（新規追加）
    } = req.body;

    // トレーニングデータを文章化
    const doneItems: string[] = [];
    const almostItems: string[] = [];

    // カスタムラベルがあればそれを使用、なければデフォルトを使用
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

    // シンプルなテンプレートベースの文章生成
    // Gemini APIを使用
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      // Gemini APIを使用した生成
      try {
        const prompt = buildPrompt(
          dog_name,
          doneItems,
          almostItems,
          morning_toilet,
          afternoon_toilet,
          memo,
          photo_analyses
        );
        console.log('🤖 Gemini API呼び出し開始');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt,
              }],
            }],
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        });

        console.log('🤖 Gemini API response status:', response.status);
        const data = await response.json();
        console.log('🤖 Gemini API response data:', JSON.stringify(data).substring(0, 500));

        if (response.ok) {
          const generatedText = extractGeminiText(data);
          console.log('🤖 Generated text length:', generatedText.length);
          if (generatedText) {
            return res.json({ comment: generatedText });
          }
          console.log('🤖 Generated text is empty, falling back to template');
        } else {
          console.error('🤖 Gemini API error response:', data);
        }
      } catch (apiError) {
        console.error('🤖 Gemini API exception:', apiError);
        // APIエラー時はテンプレートにフォールバック
      }
    } else {
      console.log('🤖 No GEMINI_API_KEY, using template');
    }

    // テンプレートベースのフォールバック
    const comment = generateTemplateComment(dog_name, doneItems, almostItems, morning_toilet, afternoon_toilet, memo);
    res.json({ comment });
  } catch (error) {
    sendServerError(res, 'コメント生成に失敗しました', error);
  }
});

function buildPrompt(
  dogName: string,
  doneItems: string[],
  almostItems: string[],
  morningToilet: { urination: boolean; defecation: boolean; location: string } | undefined,
  afternoonToilet: { urination: boolean; defecation: boolean; location: string } | undefined,
  memo?: string,
  photoAnalyses?: string[]
): string {
  let context = `あなたは犬の幼稚園・保育園のスタッフです。今日の${dogName}ちゃんの様子を飼い主さんに伝える日誌コメントを、温かみのある自然な日本語で書いてください。

以下の情報を元に、150〜250文字程度のコメントを作成してください：

`;

  // スタッフのメモがあれば最優先で反映
  if (memo && memo.trim()) {
    context += `【スタッフのメモ】\n${memo.trim()}\n\n`;
  }

  // 写真の解析結果があれば反映
  if (photoAnalyses && photoAnalyses.length > 0) {
    context += `【写真から読み取れた様子】\n`;
    photoAnalyses.forEach((analysis, index) => {
      context += `・${analysis}\n`;
    });
    context += '\n';
  }

  if (doneItems.length > 0) {
    context += `【できたこと】${doneItems.join('、')}\n`;
  }

  if (almostItems.length > 0) {
    context += `【もう少しのこと】${almostItems.join('、')}\n`;
  }

  const formatToiletStatus = (
    toilet: { urination: boolean; defecation: boolean; location: string } | undefined,
    period: string
  ): string => {
    if (!toilet) return '';
    const status = [];
    if (toilet.urination) status.push('オシッコ');
    if (toilet.defecation) status.push('ウンチ');
    if (status.length === 0) return '';
    return `【${period}のトイレ】${status.join('・')}成功（${toilet.location || '場所不明'}）\n`;
  };

  context += formatToiletStatus(morningToilet, '午前');
  context += formatToiletStatus(afternoonToilet, '午後');

  context += `
注意事項：
- 飼い主さんへの報告として自然な文章にしてください
- スタッフのメモや写真の情報を優先的に反映してください
- 絵文字は控えめに（1〜2個程度）
- ポジティブな表現を心がけてください
- 「もう少し」の項目は、前向きな表現で伝えてください`;

  return context;
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

  // 挨拶
  const greetings = [
    `今日も${dogName}ちゃん、元気いっぱいでした！`,
    `${dogName}ちゃん、今日も頑張りました！`,
    `本日の${dogName}ちゃんの様子をお伝えします。`,
  ];
  parts.push(greetings[Math.floor(Math.random() * greetings.length)]);

  // メモがあれば追加
  if (memo && memo.trim()) {
    parts.push(memo.trim());
  }

  // できたこと
  if (doneItems.length > 0) {
    if (doneItems.length === 1) {
      parts.push(`${doneItems[0]}がバッチリできました！`);
    } else if (doneItems.length <= 3) {
      parts.push(`${doneItems.join('、')}ができました。`);
    } else {
      parts.push(`${doneItems.slice(0, 3).join('、')}など、${doneItems.length}項目ができました！`);
    }
  }

  // もう少しのこと
  if (almostItems.length > 0) {
    if (almostItems.length === 1) {
      parts.push(`${almostItems[0]}はもう少しで完璧になりそうです。`);
    } else {
      parts.push(`${almostItems.slice(0, 2).join('、')}は引き続き練習していきます。`);
    }
  }

  // トイレ
  const toiletSuccess = (morningToilet?.urination || morningToilet?.defecation) ||
                       (afternoonToilet?.urination || afternoonToilet?.defecation);
  if (toiletSuccess) {
    parts.push('トイレも上手にできていました。');
  }

  // 締め
  const closings = [
    'また次回も楽しみにしています！',
    '次回も一緒に頑張りましょう！',
    '引き続きよろしくお願いします。',
  ];
  parts.push(closings[Math.floor(Math.random() * closings.length)]);

  return parts.join('\n');
}

// Base64データを処理してMIMEタイプを検出
function processBase64Image(base64Input: string): { base64Data: string; mimeType: string } {
  let base64Data = base64Input.includes(',')
    ? base64Input.split(',')[1]
    : base64Input;

  let mimeType = 'image/jpeg';
  if (base64Input.includes('data:image/')) {
    const match = base64Input.match(/data:image\/([^;]+)/);
    if (match) {
      const ext = match[1];
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';
    }
  }

  return { base64Data, mimeType };
}

// 写真からの活動推測・健康チェック
router.post('/analyze-photo', async (req: AuthRequest, res) => {
  try {
    const { mode, record_type, photo, photo_base64, dog_name } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // カルテ作成時の健康チェック用写真解析
    if (mode === 'record' || record_type) {
      if (!photo_base64 && !photo) {
        sendBadRequest(res, '写真が必要です');
        return;
      }

      // APIキーがない場合はフォールバック
      if (!apiKey) {
        return res.json({
          analysis: '写真を確認しました。',
          health_concerns: [],
          suggestion: null,
        });
      }

      // 写真URLからbase64を取得する必要がある場合の処理
      let imageBase64 = photo_base64;
      if (!imageBase64 && photo) {
        // 外部URLの場合はそのまま解析をスキップ
        return res.json({
          analysis: '写真を確認しました。',
          health_concerns: [],
          suggestion: null,
        });
      }

      const { base64Data, mimeType } = processBase64Image(imageBase64);

      // 業種に応じたプロンプトを作成
      const isGrooming = record_type === 'grooming';
      const prompt = isGrooming
        ? `この写真はトリミングサロンで撮影された犬の写真です。
${dog_name ? `犬の名前は「${dog_name}」です。` : ''}

以下の観点から健康状態を分析し、JSON形式で回答してください：

1. **皮膚の状態**: 赤み、湿疹、かゆそうな箇所、脱毛などがないか
2. **耳の状態**: 汚れ、赤み、炎症がないか
3. **目の状態**: 目やに、充血、涙やけがないか
4. **毛並み**: 毛玉、もつれ、艶の状態
5. **全体的な印象**: 健康そうか、気になる点があるか

回答形式（JSON）:
{
  "summary": "全体的な健康状態の要約（50文字程度）",
  "concerns": [
    {"area": "気になる部位", "issue": "問題の内容", "severity": "low/medium/high"}
  ],
  "coat_condition": "毛並みの状態",
  "overall_health": "良好/注意/要確認"
}`
        : `この写真は犬の幼稚園・保育園で撮影された犬の写真です。
${dog_name ? `犬の名前は「${dog_name}」です。` : ''}

以下の観点から分析し、JSON形式で回答してください：

1. **活動内容**: 何をしているか（遊んでいる、トレーニング中、休憩中など）
2. **様子・表情**: 犬の様子や表情（楽しそう、集中している、リラックスしているなど）
3. **健康面で気になる点**: 明らかに気になる点があれば（なければ空配列）

回答形式（JSON）:
{
  "summary": "活動の要約（50文字程度、飼い主向けの温かい表現で）",
  "activity": "主な活動内容",
  "mood": "犬の様子",
  "concerns": [
    {"area": "気になる部位", "issue": "問題の内容", "severity": "low/medium/high"}
  ]
}`;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: prompt },
              ],
            }],
            generationConfig: {
              maxOutputTokens: 1000,
              temperature: 0.3,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = extractGeminiText(data);

          // JSONを抽出
          let analysisResult: any = {};
          try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            }
          } catch {
            analysisResult = { summary: rawText, concerns: [] };
          }

          // 気になる点があればサジェスションを生成
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

          return res.json({
            analysis: analysisResult.summary || '写真を確認しました。',
            health_concerns: analysisResult.concerns || [],
            coat_condition: analysisResult.coat_condition,
            overall_health: analysisResult.overall_health,
            activity: analysisResult.activity,
            mood: analysisResult.mood,
            suggestion,
          });
        } else {
          console.error('Gemini API error for photo analysis');
          return res.json({
            analysis: '写真を確認しました。',
            health_concerns: [],
            suggestion: null,
          });
        }
      } catch (apiError) {
        console.error('Photo analysis API error:', apiError);
        return res.json({
          analysis: '写真を確認しました。',
          health_concerns: [],
          suggestion: null,
        });
      }
    }

    // 日誌作成時の活動推測（既存機能）
    if (!photo_base64) {
      sendBadRequest(res, '写真が必要です');
      return;
    }

    if (!apiKey) {
      return res.json({
        analysis: '楽しく遊んでいる様子が伝わりました。',
        training_suggestions: [],
        suggested_comment: '今日も元気いっぱいに過ごしていました。',
      });
    }

    const { base64Data, mimeType } = processBase64Image(photo_base64);

    try {
      const prompt = `この写真は犬の幼稚園・保育園で撮影された写真です。写真に写っている犬の活動内容を分析してください。

以下の観点から分析してください：
1. **主な活動**: 何をしているか（遊んでいる、トレーニング中、休憩中、散歩中など）
2. **トレーニング項目**: もしトレーニングをしている場合、どの項目か（オスワリ、フセ、マテ、オイデ、ツイテ、他犬との交流、人慣れなど）
3. **様子・表情**: 犬の様子や表情（楽しそう、集中している、リラックスしているなど）
4. **環境**: どこで撮影されたか（室内、屋外、散歩中など）
5. **他の要素**: 他の犬や人、おもちゃなどが写っているか

${dog_name ? `この犬の名前は「${dog_name}」です。` : ''}

分析結果を、日誌のコメントとして使えるような自然な日本語で、100文字程度でまとめてください。
温かみのある表現で、飼い主さんに伝える形式で書いてください。`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const analysis = extractGeminiText(data);

        if (!analysis) {
          throw new Error('解析結果が取得できませんでした');
        }

        // トレーニング項目を抽出（キーワードベース）
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
          .filter(([, keywords]) => keywords.some(keyword => analysis.includes(keyword)))
          .map(([id]) => id);

        return res.json({
          analysis,
          training_suggestions: trainingSuggestions,
          suggested_comment: analysis,
        });
      } else {
        const errorData = await response.json();
        console.error('Gemini API error:', errorData);
        throw new Error('写真解析に失敗しました');
      }
    } catch (apiError: any) {
      console.error('Gemini API error:', apiError);
      sendServerError(res, '写真解析に失敗しました', apiError);
      return;
    }
  } catch (error: any) {
    sendServerError(res, '写真解析に失敗しました', error);
  }
});

// 業種別レポート生成
router.post('/generate-report', async (req: AuthRequest, res) => {
  try {
    const { record_type, dog_name, grooming_data, daycare_data, hotel_data, condition, health_check, photos, notes } = req.body;

    if (!record_type || !dog_name) {
      sendBadRequest(res, 'record_typeとdog_nameは必須です');
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = generateReportFallback(record_type, dog_name);
      res.json({ report: fallback });
      return;
    }

    // 店舗の文体パターンを取得（データ活用が有効な場合）
    let styleHint = '';
    if (req.storeId) {
      const writingStyle = await analyzeWritingStyle(req.storeId, record_type);
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

      // 高品質な過去の例を取得
      const examples = await getHighQualityExamples(req.storeId, 'report_generation', record_type, 2);
      if (examples.length > 0) {
        styleHint += '\n\n【参考：この店舗で好評だった過去のレポート例】\n';
        examples.forEach((ex, i) => {
          styleHint += `例${i + 1}: ${ex.finalText.substring(0, 150)}...\n`;
        });
      }
    }

    const prompt = buildReportPrompt(record_type, dog_name, {
      grooming_data, daycare_data, hotel_data, condition, health_check, notes,
    }, styleHint);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reportText = extractGeminiText(data);
        if (reportText) {
          // 学習データを保存
          let learningDataId: number | null = null;
          if (req.storeId) {
            learningDataId = await saveAILearningData({
              storeId: req.storeId,
              dataType: 'report_generation',
              inputContext: { grooming_data, daycare_data, hotel_data, condition, health_check },
              aiOutput: reportText,
              recordType: record_type,
            });
          }

          return res.json({
            report: reportText,
            learning_data_id: learningDataId, // フィードバック用
          });
        }
      }
    } catch (apiError) {
      console.error('Gemini API error for generate-report:', apiError);
    }

    // Fallback template
    const fallback = generateReportFallback(record_type, dog_name);
    res.json({ report: fallback });
  } catch (error) {
    sendServerError(res, 'レポート生成に失敗しました', error);
  }
});

function buildReportPrompt(
  recordType: string,
  dogName: string,
  data: {
    grooming_data?: { selectedParts?: string[]; partNotes?: Record<string, string> };
    daycare_data?: { activities?: string[] };
    hotel_data?: { nights?: number; special_care?: string };
    condition?: { overall?: string };
    health_check?: { weight?: number; ears?: string; nails?: string; skin?: string; teeth?: string };
    notes?: { internal_notes?: string };
  },
  styleHint: string = ''
): string {
  const partLabels: Record<string, string> = {
    head: '頭', face: '顔', ears: '耳', body: '体',
    tail: 'しっぽ', front_legs: '前足', back_legs: '後足', hip: 'お尻',
  };

  if (recordType === 'grooming') {
    const parts = (data.grooming_data?.selectedParts || [])
      .map(p => {
        const label = partLabels[p] || p;
        const note = data.grooming_data?.partNotes?.[p];
        return note ? `${label}（${note}）` : label;
      });
    const healthNotes: string[] = [];
    if (data.health_check?.ears) healthNotes.push(`耳: ${data.health_check.ears}`);
    if (data.health_check?.skin) healthNotes.push(`皮膚: ${data.health_check.skin}`);
    if (data.health_check?.nails) healthNotes.push(`爪: ${data.health_check.nails}`);
    if (data.health_check?.teeth) healthNotes.push(`歯: ${data.health_check.teeth}`);
    const memo = data.notes?.internal_notes ? `\nスタッフメモ: ${data.notes.internal_notes}` : '';

    return `あなたはグルーミングサロンのスタッフです。${dogName}ちゃんの施術結果を飼い主さんに伝えるレポートを書いてください。

【施術部位】${parts.join('、') || '未選択'}
${healthNotes.length > 0 ? '【健康チェック】' + healthNotes.join('、') : ''}
${data.condition?.overall ? '【体調】' + data.condition.overall : ''}
${memo}

200〜300文字程度で、以下を含めてください：
- カットの仕上がり
- 健康面で気づいたこと
- ご自宅でのケアアドバイス
温かみのある丁寧な日本語でお願いします。${styleHint}`;
  }

  if (recordType === 'hotel') {
    const nights = data.hotel_data?.nights || 1;
    const specialCare = data.hotel_data?.special_care || '';
    const memo = data.notes?.internal_notes ? `\nスタッフメモ: ${data.notes.internal_notes}` : '';

    return `あなたはペットホテルのスタッフです。${dogName}ちゃんの${nights}泊の滞在レポートを飼い主さんに書いてください。

${specialCare ? '【特別ケア】' + specialCare : ''}
${data.condition?.overall ? '【体調】' + data.condition.overall : ''}
${memo}

200〜300文字程度で、以下を含めてください：
- 滞在中の様子・リラックス度
- お食事やお散歩の様子
- 飼い主さんへの安心メッセージ
温かみのある丁寧な日本語でお願いします。${styleHint}`;
  }

  // daycare (default)
  const activities = data.daycare_data?.activities?.join('、') || '';
  const memo = data.notes?.internal_notes ? `\nスタッフメモ: ${data.notes.internal_notes}` : '';

  return `あなたは犬の幼稚園のスタッフです。${dogName}ちゃんの今日の活動レポートを飼い主さんに書いてください。

【活動内容】${activities || '未記録'}
${data.condition?.overall ? '【体調】' + data.condition.overall : ''}
${memo}

200〜300文字程度で、以下を含めてください：
- 今日の活動と楽しんでいた様子
- 成長が見られた点
- 次回への期待
温かみのある丁寧な日本語でお願いします。${styleHint}`;
}

function generateReportFallback(recordType: string, dogName: string): string {
  if (recordType === 'grooming') {
    return `${dogName}ちゃんのグルーミングが完了しました！今日もとてもお利口にしてくれました。仕上がりもバッチリです。お家でのブラッシングも続けていただけると、キレイな状態を保てます。次回のご予約もお待ちしております。`;
  }
  if (recordType === 'hotel') {
    return `${dogName}ちゃんの滞在中、リラックスして過ごしてくれました。お食事もしっかり食べて、お散歩も楽しんでいました。とても穏やかに過ごしていましたのでご安心ください。またのご利用をお待ちしております。`;
  }
  return `${dogName}ちゃん、今日も元気いっぱいでした！お友達と仲良く遊んで、トレーニングも頑張りました。次回も楽しみにしています！`;
}

// 健康チェック項目のラベル
const HEALTH_ITEM_LABELS: Record<string, string> = {
  ears: '耳',
  nails: '爪',
  skin: '皮膚',
  teeth: '歯',
};

// トレーニング項目で連続して「done」になっているものを検出
function findConsistentTrainingItems(
  historyRows: Array<{ daycare_data?: { training_data?: Record<string, string> } }>,
  labels: Record<string, string>
): string[] {
  if (historyRows.length < 3) return [];

  const itemCounts: Record<string, number> = {};

  // 各記録のトレーニングデータを集計
  for (const row of historyRows) {
    const trainingData = row.daycare_data?.training_data;
    if (!trainingData) continue;

    for (const [key, value] of Object.entries(trainingData)) {
      if (value === 'done') {
        itemCounts[key] = (itemCounts[key] || 0) + 1;
      }
    }
  }

  // 3回以上連続でdoneの項目を抽出
  const consistentItems: string[] = [];
  for (const [key, count] of Object.entries(itemCounts)) {
    if (count >= 3) {
      const label = labels[key] || TRAINING_LABELS[key] || key;
      consistentItems.push(label);
    }
  }

  return consistentItems;
}

// AIサジェスション取得
router.get('/suggestions/:recordId', async (req: AuthRequest, res) => {
  try {
    const { recordId } = req.params;

    if (!recordId) {
      sendBadRequest(res, 'recordIdは必須です');
      return;
    }

    // 現在のカルテを取得
    const recordResult = await pool.query(
      `SELECT id, dog_id, record_type, record_date, notes, health_check, photos, hotel_data, daycare_data
       FROM records
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [recordId, req.storeId]
    );

    if (recordResult.rows.length === 0) {
      sendBadRequest(res, 'カルテが見つかりません');
      return;
    }

    const record = recordResult.rows[0];
    const suggestions: Array<{ type: string; message: string; actionLabel?: string; variant?: string; preview?: string; payload?: Record<string, unknown> }> = [];

    // 犬の情報を取得（誕生日チェック用）
    const dogResult = await pool.query(
      `SELECT name, birth_date FROM dogs WHERE id = $1`,
      [record.dog_id]
    );
    const dog = dogResult.rows[0];

    // 前回の記録を取得
    const prevRecordResult = await pool.query(
      `SELECT id, record_date, notes, health_check, photos
       FROM records
       WHERE dog_id = $1 AND store_id = $2 AND id <> $3
         AND deleted_at IS NULL
       ORDER BY record_date DESC
       LIMIT 1`,
      [record.dog_id, req.storeId, recordId]
    );
    const prevRecord = prevRecordResult.rows[0];

    // 1. レポート下書きサジェスション
    const reportText = record.notes?.report_text || '';
    if (!reportText || reportText.trim().length === 0) {
      suggestions.push({
        type: 'report-draft',
        message: '入力内容から報告文を作成しました',
        actionLabel: '下書きを使用',
        variant: 'default',
        preview: 'AIで報告文を生成できます',
      });
    }

    // 2. 誕生日チェック（全業種）
    if (dog?.birth_date) {
      const today = new Date();
      const birthDate = new Date(dog.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      let daysUntil = Math.floor((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 過ぎていたら来年の誕生日までの日数
      if (daysUntil < 0) {
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        daysUntil = Math.floor((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysUntil >= 0 && daysUntil <= 7) {
        suggestions.push({
          type: 'birthday',
          message: daysUntil === 0
            ? `今日は${dog.name}ちゃんのお誕生日です！🎂`
            : `${dog.name}ちゃんのお誕生日まであと${daysUntil}日です`,
          actionLabel: 'お祝いメッセージを追加',
          variant: 'success',
        });
      }
    }

    // 3. 久しぶりの来店チェック（全業種）
    if (prevRecord) {
      const currentDate = new Date(record.record_date);
      const prevDate = new Date(prevRecord.record_date);
      const daysSince = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince > 30) {
        suggestions.push({
          type: 'long-absence',
          message: `${daysSince}日ぶりのご来店です`,
          actionLabel: '報告文で触れる',
          variant: 'default',
        });
      }
    }

    // 4. 前回の気になる点フォローアップ（全業種）
    if (prevRecord?.photos?.concerns && Array.isArray(prevRecord.photos.concerns) && prevRecord.photos.concerns.length > 0) {
      const concernLabel = prevRecord.photos.concerns[0]?.label || '気になる点';
      suggestions.push({
        type: 'follow-up',
        message: `前回「${concernLabel}」の記録がありました`,
        actionLabel: '今回の様子を確認',
        variant: 'warning',
        payload: { prevConcerns: prevRecord.photos.concerns },
      });
    }

    // 5. グルーミング固有のサジェスション
    if (record.record_type === 'grooming') {
      // 健康チェック履歴を取得
      const historyResult = await pool.query(
        `SELECT health_check
         FROM records
         WHERE dog_id = $1 AND store_id = $2 AND record_type = 'grooming'
           AND deleted_at IS NULL AND id <> $3
         ORDER BY record_date DESC
         LIMIT 2`,
        [record.dog_id, req.storeId, recordId]
      );

      // 体重変動チェック
      const currentWeight = record.health_check?.weight;
      const prevWeight = prevRecord?.health_check?.weight;
      if (currentWeight && prevWeight && prevWeight > 0) {
        const change = ((currentWeight - prevWeight) / prevWeight) * 100;
        if (Math.abs(change) >= 10) {
          suggestions.push({
            type: 'weight-change',
            message: `体重が前回より${change > 0 ? '+' : ''}${change.toFixed(1)}%変化しています`,
            actionLabel: '報告文に追記',
            variant: Math.abs(change) > 15 ? 'warning' : 'default',
          });
        }
      }

      // 健康チェック異常パターン（耳、爪、皮膚、歯）
      const healthItems = ['ears', 'nails', 'skin', 'teeth'] as const;
      const abnormalValues = ['汚れ', '伸びている', '異常あり', '要注意', '汚れあり'];

      for (const item of healthItems) {
        const currentValue = record.health_check?.[item];
        if (currentValue && abnormalValues.includes(currentValue)) {
          const count = historyResult.rows.filter((row: any) =>
            row.health_check?.[item] && abnormalValues.includes(row.health_check[item])
          ).length;

          if (count >= 1) {
            const itemLabel = HEALTH_ITEM_LABELS[item] || item;
            suggestions.push({
              type: 'health-history',
              message: `${itemLabel}の状態が続いています（${currentValue}）`,
              actionLabel: '報告文に追記',
              variant: 'warning',
            });
            break; // 最初の1つだけ表示
          }
        }
      }
    }

    // 6. 幼稚園固有のサジェスション
    if (record.record_type === 'daycare') {
      // トレーニング履歴を取得
      const trainingHistoryResult = await pool.query(
        `SELECT daycare_data
         FROM records
         WHERE dog_id = $1 AND store_id = $2 AND record_type = 'daycare'
           AND deleted_at IS NULL
         ORDER BY record_date DESC
         LIMIT 5`,
        [record.dog_id, req.storeId]
      );

      // カスタムラベルを取得
      const labelResult = await pool.query(
        `SELECT item_key, item_label FROM training_masters WHERE store_id = $1 AND enabled = true`,
        [req.storeId]
      );
      const customLabels: Record<string, string> = {};
      labelResult.rows.forEach((row: any) => {
        customLabels[row.item_key] = row.item_label;
      });

      const consistentItems = findConsistentTrainingItems(trainingHistoryResult.rows, customLabels);
      if (consistentItems.length > 0) {
        const displayItems = consistentItems.slice(0, 2).join('、');
        suggestions.push({
          type: 'training-progress',
          message: `${displayItems}${consistentItems.length > 2 ? 'など' : ''}が連続でできています！`,
          actionLabel: '成長を報告文に追記',
          variant: 'success',
        });
      }
    }

    // 7. ホテル固有のサジェスション
    if (record.record_type === 'hotel') {
      const nights = record.hotel_data?.nights;
      if (nights && nights >= 2) {
        suggestions.push({
          type: 'long-stay',
          message: `${nights}泊の長期滞在です`,
          actionLabel: '滞在中の様子を詳しく記録',
          variant: 'default',
        });
      }
    }

    res.json({ suggestions });
  } catch (error) {
    sendServerError(res, 'サジェスション取得に失敗しました', error);
  }
});

// AI出力へのフィードバック記録
router.post('/feedback', async (req: AuthRequest, res) => {
  try {
    const { learning_data_id, was_used, was_edited, final_text } = req.body;

    if (learning_data_id && req.storeId) {
      await recordAIFeedback({
        learningDataId: learning_data_id,
        wasUsed: was_used ?? false,
        wasEdited: was_edited ?? false,
        finalText: final_text,
      });
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'フィードバック記録に失敗しました', error);
  }
});

// サジェスションへのフィードバック記録
router.post('/suggestion-feedback', async (req: AuthRequest, res) => {
  try {
    const { suggestion_type, was_applied, record_type } = req.body;

    if (suggestion_type && req.storeId) {
      await recordSuggestionFeedback(
        req.storeId,
        suggestion_type,
        was_applied ?? false,
        record_type
      );
    }

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, 'フィードバック記録に失敗しました', error);
  }
});

// AI設定の取得
router.get('/settings', async (req: AuthRequest, res) => {
  try {
    if (!req.storeId) {
      sendBadRequest(res, 'storeIdが必要です');
      return;
    }

    const settings = await getAISettings(req.storeId);
    res.json(settings);
  } catch (error) {
    sendServerError(res, 'AI設定の取得に失敗しました', error);
  }
});

export default router;
