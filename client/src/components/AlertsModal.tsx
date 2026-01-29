import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import api from '../api/client'

interface Alert {
  id: number
  dog_id: number
  dog_name: string
  dog_gender?: string
  owner_name?: string
  alert_type: string
  mixed_vaccine_date?: string
  rabies_vaccine_date?: string
}

// alert_typeに基づいてメッセージを生成
const getAlertMessage = (alert: Alert): string => {
  switch (alert.alert_type) {
    case 'mixed_vaccine_expired':
      return `混合ワクチンの期限が切れています${alert.mixed_vaccine_date ? `（期限: ${new Date(alert.mixed_vaccine_date).toLocaleDateString('ja-JP')}）` : ''}`
    case 'rabies_vaccine_expiring':
      return `狂犬病ワクチンの期限が近づいています${alert.rabies_vaccine_date ? `（期限: ${new Date(alert.rabies_vaccine_date).toLocaleDateString('ja-JP')}）` : ''}`
    case 'rabies_vaccine_expired':
      return `狂犬病ワクチンの期限が切れています${alert.rabies_vaccine_date ? `（期限: ${new Date(alert.rabies_vaccine_date).toLocaleDateString('ja-JP')}）` : ''}`
    default:
      return '確認が必要です'
  }
}

// alert_typeに基づいてアイコンを取得
const getAlertIcon = (alertType: string): string => {
  switch (alertType) {
    case 'mixed_vaccine_expired':
    case 'rabies_vaccine_expired':
      return 'solar:danger-triangle-bold'
    case 'rabies_vaccine_expiring':
      return 'solar:alarm-bold'
    default:
      return 'solar:bell-bold'
  }
}

// alert_typeに基づいてラベルを取得
const getAlertLabel = (alertType: string): string => {
  switch (alertType) {
    case 'mixed_vaccine_expired':
      return '混合ワクチン期限切れ'
    case 'rabies_vaccine_expiring':
      return '狂犬病ワクチン期限間近'
    case 'rabies_vaccine_expired':
      return '狂犬病ワクチン期限切れ'
    default:
      return '確認事項'
  }
}

interface AlertsModalProps {
  isOpen: boolean
  onClose: () => void
}

const AlertsModal = ({ isOpen, onClose }: AlertsModalProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchAlerts()
    }
  }, [isOpen])

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/dashboard')
      setAlerts(response.data.alerts || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* モーダル */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-card rounded-2xl border border-border shadow-xl z-50 max-h-[80vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:bell-bold" className="text-chart-4 size-5" />
            確認事項
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="閉じる"
          >
            <Icon icon="solar:close-circle-bold" className="size-6 text-muted-foreground" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center py-8">
              <span className="text-sm text-muted-foreground">読み込み中...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Icon icon="solar:check-circle-bold" className="size-8 text-chart-2" />
              </div>
              <p className="text-sm font-medium mb-1">確認事項はありません</p>
              <p className="text-xs text-muted-foreground">すべて確認済みです</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={`${alert.dog_id}-${alert.alert_type}-${index}`}
                  className="bg-chart-4/10 border border-chart-4/20 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-chart-4/20 flex items-center justify-center shrink-0">
                      <Icon icon={getAlertIcon(alert.alert_type)} className="size-5 text-chart-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-foreground">{alert.dog_name}</p>
                        {alert.owner_name && (
                          <span className="text-xs text-muted-foreground">({alert.owner_name}様)</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-chart-4 mb-1">{getAlertLabel(alert.alert_type)}</p>
                      <p className="text-xs text-muted-foreground">{getAlertMessage(alert)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AlertsModal
