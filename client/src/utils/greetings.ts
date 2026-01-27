// 時間帯別のClaudeスタイルメッセージ集
const GREETINGS = {
  morning: [
    'おはようございます',
    '新しい一日の始まりですね',
    '朝のコーヒーはいかがですか？',
    '今日も素敵な出会いがありますように',
    '朝日が気持ちいい一日ですね',
    'ワンちゃんたちが待っていますよ',
  ],
  afternoon: [
    'こんにちは',
    '午後のひととき、いかがお過ごしですか',
    'コーヒーブレイクはいかがですか？',
    '良い午後をお過ごしください',
    'お昼を過ぎましたね',
    '午後も張り切っていきましょう',
  ],
  evening: [
    'こんばんは',
    'お疲れさまです',
    '夕暮れ時ですね',
    '今日も一日お疲れさまでした',
    '素敵な夜をお過ごしください',
    'そろそろ帰り支度の時間ですね',
  ],
  night: [
    'お疲れさまです',
    '夜遅くまでお仕事ですか？',
    'ゆっくり休んでくださいね',
    '今日も一日ありがとうございました',
    '明日も良い一日になりますように',
  ],
}

type TimeOfDay = keyof typeof GREETINGS

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function getRandomGreeting(): string {
  const timeOfDay = getTimeOfDay()
  const messages = GREETINGS[timeOfDay]
  return messages[Math.floor(Math.random() * messages.length)]
}
