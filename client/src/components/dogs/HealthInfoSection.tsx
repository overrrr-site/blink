import { Icon } from '../Icon'
import { getVaccineStatus } from '../../utils/dog'

type DogHealth = {
  mixed_vaccine_date?: string
  rabies_vaccine_date?: string
}

type HealthInfoSectionProps = {
  health: DogHealth
}

function getStatusContainerClass(status: string): string {
  switch (status) {
    case 'expired':
      return 'bg-destructive/10 border border-destructive/30'
    case 'warning':
      return 'bg-chart-4/10 border border-chart-4/30'
    case 'caution':
      return 'bg-chart-4/5 border border-chart-4/20'
    default:
      return ''
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'expired':
      return 'bg-destructive/90 text-white'
    case 'warning':
      return 'bg-chart-4 text-white'
    default:
      return 'bg-chart-4/20 text-chart-4'
  }
}

function getStatusLabel(status: string, days: number, label: string | null): string {
  switch (status) {
    case 'expired':
      return `要確認：ワクチン更新（${days}日超過）`
    case 'warning':
      return `要確認：あと${days}日で期限切れ`
    default:
      return label || ''
  }
}

interface VaccineRowProps {
  label: string
  date: string
}

function VaccineRow({ label, date }: VaccineRowProps): JSX.Element | null {
  const vaccineStatus = getVaccineStatus(date)

  return (
    <div className={`p-3 rounded-xl ${getStatusContainerClass(vaccineStatus?.status ?? '')}`}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs text-muted-foreground">{label}</label>
          <p className="text-base font-medium">
            {new Date(date).toLocaleDateString('ja-JP')}
          </p>
        </div>
        {vaccineStatus?.label && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${getStatusBadgeClass(vaccineStatus.status)}`}
          >
            {vaccineStatus.status === 'expired' && (
              <Icon icon="solar:danger-triangle-bold" width="12" height="12" />
            )}
            {getStatusLabel(vaccineStatus.status, vaccineStatus.days, vaccineStatus.label)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function HealthInfoSection({ health }: HealthInfoSectionProps): JSX.Element {
  const hasVaccineData = Boolean(health.mixed_vaccine_date || health.rabies_vaccine_date)

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="text-lg font-bold mb-4">健康情報</h3>
      <div className="space-y-3">
        {health.mixed_vaccine_date && (
          <VaccineRow label="混合ワクチン接種日" date={health.mixed_vaccine_date} />
        )}
        {health.rabies_vaccine_date && (
          <VaccineRow label="狂犬病予防接種日" date={health.rabies_vaccine_date} />
        )}
        {!hasVaccineData && (
          <p className="text-sm text-muted-foreground">健康情報は未登録です。編集画面から登録できます。</p>
        )}
      </div>
    </div>
  )
}
