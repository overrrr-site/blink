import { isNonEmptyString } from './validation.js';

export const BUSINESS_TYPES = ['grooming', 'daycare', 'hotel'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === 'string' && BUSINESS_TYPES.includes(value as BusinessType);
}

export function parseBusinessTypeInput(
  value: unknown,
  fieldLabel: 'service_type' | 'record_type'
): { value?: BusinessType; error?: string } {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!isNonEmptyString(raw)) {
    return { value: undefined };
  }
  if (!isBusinessType(raw)) {
    return { error: `${fieldLabel}が不正です` };
  }
  return { value: raw };
}

export function appendBusinessTypeFilter(
  params: Array<string | number>,
  field: string,
  businessType?: BusinessType
): string {
  if (!businessType) return '';
  params.push(businessType);
  return ` AND ${field} = $${params.length}`;
}

// ---------------------------------------------------------------------------
// normalizeBusinessTypes (shared utility)
// ---------------------------------------------------------------------------

export function normalizeBusinessTypes(value: unknown): BusinessType[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<BusinessType>();
  for (const item of value) {
    if (isBusinessType(item)) unique.add(item);
  }
  return Array.from(unique);
}

// ---------------------------------------------------------------------------
// Chatbot business type config
// ---------------------------------------------------------------------------

export interface ChatbotBusinessConfig {
  label: string;
  reservationLabel: string;
  recordLabel: string;
  recordKeywords: string;
  checkInLabel: string;
  color: string;
  emoji: string;
}

export const CHATBOT_BUSINESS_CONFIG: Record<BusinessType, ChatbotBusinessConfig> = {
  daycare: {
    label: '幼稚園',
    reservationLabel: '登園予約',
    recordLabel: '日誌',
    recordKeywords: '「日誌」「日報」',
    checkInLabel: '登園',
    color: '#F97316',
    emoji: '🐾',
  },
  grooming: {
    label: 'トリミング',
    reservationLabel: 'トリミング予約',
    recordLabel: 'カルテ',
    recordKeywords: '「カルテ」',
    checkInLabel: 'ご来店',
    color: '#8B5CF6',
    emoji: '✂️',
  },
  hotel: {
    label: 'ホテル',
    reservationLabel: '宿泊予約',
    recordLabel: '宿泊記録',
    recordKeywords: '「宿泊記録」',
    checkInLabel: 'チェックイン',
    color: '#06B6D4',
    emoji: '🏨',
  },
};

export function getChatbotConfig(type: unknown): ChatbotBusinessConfig {
  if (isBusinessType(type)) return CHATBOT_BUSINESS_CONFIG[type];
  return CHATBOT_BUSINESS_CONFIG.daycare;
}

export function getRecordQuickReplyLabel(businessTypes: BusinessType[]): string {
  if (businessTypes.length === 1) {
    return CHATBOT_BUSINESS_CONFIG[businessTypes[0]].recordLabel + 'を見る';
  }
  return '記録を見る';
}
