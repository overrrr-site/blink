export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNumberLike(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && Number.isFinite(Number(trimmed));
  }
  return false;
}
