export function buildDaycareCommentPrompt(
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
    context += '【写真から読み取れた様子】\n';
    photoAnalyses.forEach((analysis) => {
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

export function buildRecordPhotoPrompt(recordType: string, dogName?: string): string {
  const isGrooming = recordType === 'grooming';

  if (isGrooming) {
    return `この写真はトリミングサロンで撮影された犬の写真です。
${dogName ? `犬の名前は「${dogName}」です。` : ''}

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
}`;
  }

  return `この写真は犬の幼稚園・保育園で撮影された犬の写真です。
${dogName ? `犬の名前は「${dogName}」です。` : ''}

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
}

export function buildActivityPhotoPrompt(dogName?: string): string {
  return `この写真は犬の幼稚園・保育園で撮影された写真です。写真に写っている犬の活動内容を分析してください。

以下の観点から分析してください：
1. **主な活動**: 何をしているか（遊んでいる、トレーニング中、休憩中、散歩中など）
2. **トレーニング項目**: もしトレーニングをしている場合、どの項目か（オスワリ、フセ、マテ、オイデ、ツイテ、他犬との交流、人慣れなど）
3. **様子・表情**: 犬の様子や表情（楽しそう、集中している、リラックスしているなど）
4. **環境**: どこで撮影されたか（室内、屋外、散歩中など）
5. **他の要素**: 他の犬や人、おもちゃなどが写っているか

${dogName ? `この犬の名前は「${dogName}」です。` : ''}

分析結果を、日誌のコメントとして使えるような自然な日本語で、100文字程度でまとめてください。
温かみのある表現で、飼い主さんに伝える形式で書いてください。`;
}

export function buildReportPrompt(
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
      .map((p) => {
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

    return `あなたはトリミングサロンのスタッフです。${dogName}ちゃんの施術結果を飼い主さんに伝えるレポートを書いてください。

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
