import { getVaccineStatus } from '../../utils/dog'

type DogHealth = {
  mixed_vaccine_date?: string
  rabies_vaccine_date?: string
}

type HealthInfoSectionProps = {
  health: DogHealth
}

export default function HealthInfoSection({ health }: HealthInfoSectionProps) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="text-lg font-bold mb-4">健康情報</h3>
      <div className="space-y-3">
        {health.mixed_vaccine_date && (() => {
          const vaccineStatus = getVaccineStatus(health.mixed_vaccine_date)
          return (
            <div
              className={`p-3 rounded-xl ${
                vaccineStatus?.status === 'expired'
                  ? 'bg-destructive/10 border border-destructive/30'
                  : vaccineStatus?.status === 'warning'
                  ? 'bg-chart-4/10 border border-chart-4/30'
                  : vaccineStatus?.status === 'caution'
                  ? 'bg-chart-4/5 border border-chart-4/20'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-muted-foreground">混合ワクチン接種日</label>
                  <p className="text-base font-medium">
                    {new Date(health.mixed_vaccine_date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                {vaccineStatus?.label && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      vaccineStatus.status === 'expired'
                        ? 'bg-destructive/90 text-white'
                        : vaccineStatus.status === 'warning'
                        ? 'bg-chart-4 text-white'
                        : 'bg-chart-4/20 text-chart-4'
                    }`}
                  >
                    {vaccineStatus.status === 'expired' && (
                      <iconify-icon icon="solar:danger-triangle-bold" width="12" height="12"></iconify-icon>
                    )}
                    {vaccineStatus.status === 'expired'
                      ? `要確認：ワクチン更新（${vaccineStatus.days}日超過）`
                      : vaccineStatus.status === 'warning'
                      ? `要確認：あと${vaccineStatus.days}日で期限切れ`
                      : vaccineStatus.label}
                  </span>
                )}
              </div>
            </div>
          )
        })()}
        {health.rabies_vaccine_date && (() => {
          const vaccineStatus = getVaccineStatus(health.rabies_vaccine_date)
          return (
            <div
              className={`p-3 rounded-xl ${
                vaccineStatus?.status === 'expired'
                  ? 'bg-destructive/10 border border-destructive/30'
                  : vaccineStatus?.status === 'warning'
                  ? 'bg-chart-4/10 border border-chart-4/30'
                  : vaccineStatus?.status === 'caution'
                  ? 'bg-chart-4/5 border border-chart-4/20'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-muted-foreground">狂犬病予防接種日</label>
                  <p className="text-base font-medium">
                    {new Date(health.rabies_vaccine_date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                {vaccineStatus?.label && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      vaccineStatus.status === 'expired'
                        ? 'bg-destructive/90 text-white'
                        : vaccineStatus.status === 'warning'
                        ? 'bg-chart-4 text-white'
                        : 'bg-chart-4/20 text-chart-4'
                    }`}
                  >
                    {vaccineStatus.status === 'expired' && (
                      <iconify-icon icon="solar:danger-triangle-bold" width="12" height="12"></iconify-icon>
                    )}
                    {vaccineStatus.status === 'expired'
                      ? `要確認：ワクチン更新（${vaccineStatus.days}日超過）`
                      : vaccineStatus.status === 'warning'
                      ? `要確認：あと${vaccineStatus.days}日で期限切れ`
                      : vaccineStatus.label}
                  </span>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
