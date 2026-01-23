import { useEffect, useState } from 'react'
import api from '../api/client'

interface Alert {
  id: number
  dog_id: number
  dog_name: string
  alert_type: string
  message: string
  alert_date?: string
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
    } catch (error) {
      console.error('Error fetching alerts:', error)
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
            <iconify-icon icon="solar:bell-bold" className="text-chart-4 size-5"></iconify-icon>
            確認事項
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="閉じる"
          >
            <iconify-icon icon="solar:close-circle-bold" className="size-6 text-muted-foreground"></iconify-icon>
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
                <iconify-icon icon="solar:check-circle-bold" className="size-8 text-chart-2"></iconify-icon>
              </div>
              <p className="text-sm font-medium mb-1">確認事項はありません</p>
              <p className="text-xs text-muted-foreground">すべて確認済みです</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-chart-4/10 border border-chart-4/20 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-chart-4/20 flex items-center justify-center shrink-0">
                      <iconify-icon icon="solar:bell-bold" className="size-5 text-chart-4"></iconify-icon>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-1">{alert.dog_name}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      {alert.alert_date && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(alert.alert_date).toLocaleDateString('ja-JP')}
                        </p>
                      )}
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
