function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0) return null;
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return parsed;
  }

  return null;
}

export function parseDogId(value: unknown): number | null {
  return parsePositiveInt(value);
}

export function parseEntryId(value: unknown): number | null {
  return parsePositiveInt(value);
}

export function parseCategoryId(value: unknown): number | null {
  return parsePositiveInt(value);
}

export function parseTrainingItemId(value: unknown): number | null {
  return parsePositiveInt(value);
}

export function parseOptionalIdArray(value: unknown): number[] | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return null;

  const parsed: number[] = [];
  for (const item of value) {
    const id = parsePositiveInt(item);
    if (!id) return null;
    parsed.push(id);
  }
  return parsed;
}

export function parseRequiredIdArray(value: unknown): number[] | null {
  const parsed = parseOptionalIdArray(value);
  if (!parsed || parsed.length === 0) return null;
  return parsed;
}
