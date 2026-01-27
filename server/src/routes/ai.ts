import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendBadRequest, sendServerError } from '../utils/response.js';

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

const ACHIEVEMENT_LABELS: Record<string, string> = {
  done: 'できた',
  almost: 'もう少し',
  not_done: '未実施',
};

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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
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
            },
          }),
        });

        console.log('🤖 Gemini API response status:', response.status);
        const data = await response.json();
        console.log('🤖 Gemini API response data:', JSON.stringify(data).substring(0, 500));

        if (response.ok) {
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

// 写真からの活動推測
router.post('/analyze-photo', async (req: AuthRequest, res) => {
  try {
    const { photo_base64, dog_name } = req.body;

    if (!photo_base64) {
      sendBadRequest(res, '写真が必要です');
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      sendServerError(res, 'AI機能が利用できません', new Error('Missing Gemini API key'));
      return;
    }

    // base64データからdata:image/...;base64,の部分を除去
    let base64Data = photo_base64.includes(',') 
      ? photo_base64.split(',')[1] 
      : photo_base64;
    
    // メディアタイプを検出
    let mimeType = 'image/jpeg' // デフォルト
    if (photo_base64.includes('data:image/')) {
      const match = photo_base64.match(/data:image\/([^;]+)/)
      if (match) {
        const ext = match[1]
        if (ext === 'png') mimeType = 'image/png'
        else if (ext === 'gif') mimeType = 'image/gif'
        else if (ext === 'webp') mimeType = 'image/webp'
      }
    }

    // Gemini APIを使用して写真を解析
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
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
        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
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
          suggested_comment: analysis, // 分析結果をそのままコメントとして使用
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

export default router;
