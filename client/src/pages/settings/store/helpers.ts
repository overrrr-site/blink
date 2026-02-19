export function shallowEqualRecord(
  a: Record<string, string | number | boolean | null | undefined>,
  b: Record<string, string | number | boolean | null | undefined>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}
