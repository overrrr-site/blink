export function serializeJsonOrNull(value: unknown): string | null {
  if (!value) return null;
  return JSON.stringify(value);
}

export function escapeCsvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function hasRequiredGroomingCounseling(groomingData: unknown): boolean {
  if (!groomingData) return false;

  let parsed = groomingData;
  if (typeof groomingData === 'string') {
    try {
      parsed = JSON.parse(groomingData);
    } catch {
      return false;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const counseling = (parsed as Record<string, unknown>).counseling;
  if (!counseling || typeof counseling !== 'object' || Array.isArray(counseling)) {
    return false;
  }

  const styleRequest = (counseling as Record<string, unknown>).style_request;
  const conditionNotes = (counseling as Record<string, unknown>).condition_notes;
  const consentConfirmed = (counseling as Record<string, unknown>).consent_confirmed;

  return (
    typeof styleRequest === 'string'
    && styleRequest.trim().length > 0
    && typeof conditionNotes === 'string'
    && conditionNotes.trim().length > 0
    && consentConfirmed === true
  );
}
