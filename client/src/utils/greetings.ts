// ダッシュボード見出し用メッセージ（全て13文字以内）
export const GREETINGS = {
  morning: [
    'おはようございます',
    'いいお天気ですね',
    '本日もお願いいたします',
    'いい一日になりそうです',
    'ご準備はいかがですか',
    '本日も張り切って',
    '素敵な朝ですね',
  ],
  afternoon: [
    'こんにちは',
    'いい調子ですね',
    '午後もこの調子で',
    'ひと息いかがですか',
    '順調にお進みですね',
    '午後もお供します',
    'いいペースですね',
  ],
  evening: [
    'こんばんは',
    'お疲れさまです',
    'お疲れさまでした',
    'いい一日でしたね',
    'あともうひと息です',
    '本日もありがとう',
    'もう少しですね',
  ],
  night: [
    'お疲れさまでした',
    '遅くまでお疲れさまです',
    '本日もありがとう',
    'ごゆっくりお休みください',
    'おやすみなさい',
    'また明日お会いしましょう',
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
