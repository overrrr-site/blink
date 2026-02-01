export type VaccineStatus = {
  status: 'expired' | 'warning' | 'caution' | 'ok'
  days: number
  label: string | null
}

export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  if (years === 0) {
    return `${months}ヶ月`
  }

  return `${years}歳${months > 0 ? `${months}ヶ月` : ''}`
}

export function getVaccineStatus(vaccineDate?: string): VaccineStatus | null {
  if (!vaccineDate) return null

  const expiryDate = new Date(vaccineDate)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)

  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return { status: 'expired', days: Math.abs(daysUntilExpiry), label: `${Math.abs(daysUntilExpiry)}日超過` }
  }
  if (daysUntilExpiry <= 14) {
    return { status: 'warning', days: daysUntilExpiry, label: `あと${daysUntilExpiry}日` }
  }
  if (daysUntilExpiry <= 30) {
    return { status: 'caution', days: daysUntilExpiry, label: `あと${daysUntilExpiry}日` }
  }
  return { status: 'ok', days: daysUntilExpiry, label: null }
}
