const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

export function normalizeEntryDate(entryDate: string): string {
  const raw = String(entryDate ?? '').trim()
  if (!raw) {
    return ''
  }

  const directMatch = raw.match(DATE_PREFIX_PATTERN)
  if (directMatch) {
    return directMatch[0]
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return raw
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatEntryDateShort(entryDate: string): string {
  const normalized = normalizeEntryDate(entryDate)
  const match = normalized.match(DATE_PREFIX_PATTERN)

  if (match) {
    return `${Number(match[2])}/${Number(match[3])}`
  }

  const parsed = new Date(entryDate)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return `${parsed.getMonth() + 1}/${parsed.getDate()}`
}
