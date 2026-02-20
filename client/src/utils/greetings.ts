// ダッシュボード見出し用メッセージ（全て13文字以内）
export const GREETINGS = {
  morning: [
    'おはようございます',
    '眠気は抜けましたか',
    'コーヒーどうですか',
    '今日もいい流れで',
    '焦らず始めましょう',
    'まずは深呼吸から',
    '準備は万全ですか',
  ],
  afternoon: [
    'こんにちは',
    '午後もいい調子です',
    'ここからもう一段',
    'ひと息つけましたか',
    '水分補給も忘れずに',
    'もうひと踏ん張りです',
    '落ち着いていきましょう',
  ],
  evening: [
    'こんばんは',
    'お疲れさまです',
    'もうひと踏ん張りです',
    '最後まで丁寧に',
    'いい締めにしましょう',
    '忘れ物チェックです',
    '落ち着いて進めましょう',
  ],
  night: [
    '本日もお疲れさまです',
    '遅くまでお疲れさまです',
    '無理せず休みましょう',
    '明日の準備は大丈夫ですか',
    '今日はよく頑張りました',
    '今夜はゆっくり休みましょう',
  ],
} as const

type TimeOfDay = keyof typeof GREETINGS
export const MAX_GREETING_LENGTH = 13

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function getRandomGreeting(): string {
  const timeOfDay = getTimeOfDay()
  return pickRandom(GREETINGS[timeOfDay])
}
