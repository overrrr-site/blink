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
