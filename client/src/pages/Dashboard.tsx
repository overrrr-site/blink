import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import AlertsModal from '../components/AlertsModal'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

interface Reservation {
  id: number
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  reservation_date: string
  reservation_time: string
  status: '予定' | '登園済' | '退園済' | 'キャンセル'
  checked_in_at?: string
  // 連絡帳（飼い主からの入力）
  pvi_morning_urination?: boolean
  pvi_morning_defecation?: boolean
  breakfast_status?: string
  health_status?: string
  notes?: string
}

interface DashboardData {
  todayReservations: Reservation[]
  incompleteJournals: any[]
  alerts: any[]
  todayInspectionRecord: any | null
  capacity?: number
  announcementStats?: {
    published: number
    draft: number
  }
}

type StatusFilter = 'all' | '来園待ち' | '在園中' | '帰宅済'

interface FilterConfig {
  id: StatusFilter
  label: string
  icon: string
  borderColor: string
}

const FILTER_OPTIONS: FilterConfig[] = [
  { id: 'all', label: 'すべて', icon: 'solar:list-bold', borderColor: 'border-primary' },
  { id: '来園待ち', label: '登園前', icon: 'solar:clock-circle-bold', borderColor: 'border-chart-4' },
  { id: '在園中', label: '利用中', icon: 'solar:home-smile-bold', borderColor: 'border-chart-2' },
  { id: '帰宅済', label: '帰宅済', icon: 'solar:check-circle-bold', borderColor: 'border-chart-3' },
]

type DisplayStatus = '来園待ち' | '在園中' | '帰宅済'

function getDisplayStatus(reservation: Reservation): DisplayStatus {
  if (reservation.status === '退園済') {
    return '帰宅済'
  }
  if (reservation.status === '登園済') {
    return '在園中'
  }
  return '来園待ち'
}

function getStatusLabel(status: DisplayStatus): string {
  switch (status) {
    case '来園待ち': return '登園前'
    case '在園中': return '利用中'
    case '帰宅済': return '帰宅済み'
  }
}

function hasPreVisitInput(reservation: Reservation): boolean {
  return Boolean(reservation.notes || reservation.health_status || reservation.breakfast_status)
}

function Dashboard(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [checkingIn, setCheckingIn] = useState<number | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [alertsModalOpen, setAlertsModalOpen] = useState(false)
  const navigate = useNavigate()

  async function fetchDashboard(): Promise<void> {
    try {
      const response = await api.get('/dashboard')
      setData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleCheckIn = useCallback(async function(reservationId: number): Promise<void> {
    setCheckingIn(reservationId)
    try {
      await api.put(`/reservations/${reservationId}`, {
        status: '登園済',
      })
      await fetchDashboard()
    } catch (error) {
      console.error('Error checking in:', error)
      alert('登園処理に失敗しました')
    } finally {
      setCheckingIn(null)
    }
  }, [])

  const filteredReservations = useMemo(function(): Reservation[] {
    if (!data?.todayReservations) return []
    return data.todayReservations.filter(function(r) {
      if (r.status === 'キャンセル') return false
      if (statusFilter === 'all') return true
      return getDisplayStatus(r) === statusFilter
    })
  }, [data?.todayReservations, statusFilter])

  const statusCounts = useMemo(function(): Record<DisplayStatus, number> {
    const reservations = data?.todayReservations || []
    const activeReservations = reservations.filter(function(r) {
      return r.status !== 'キャンセル'
    })
    return {
      '来園待ち': activeReservations.filter(function(r) { return getDisplayStatus(r) === '来園待ち' }).length,
      '在園中': activeReservations.filter(function(r) { return getDisplayStatus(r) === '在園中' }).length,
      '帰宅済': activeReservations.filter(function(r) { return getDisplayStatus(r) === '帰宅済' }).length,
    }
  }, [data?.todayReservations])

  const currentCount = useMemo(function(): number {
    if (!data?.todayReservations) return 0
    return data.todayReservations.filter(function(r) {
      return r.status !== 'キャンセル'
    }).length
  }, [data?.todayReservations])

  const groupedReservations = useMemo(function(): [string, Reservation[]][] {
    const groups: Record<string, Reservation[]> = {}
    filteredReservations.forEach(function(r) {
      const time = r.reservation_time.slice(0, 5)
      if (!groups[time]) groups[time] = []
      groups[time].push(r)
    })
    return Object.entries(groups).sort(function([a], [b]) {
      return a.localeCompare(b)
    })
  }, [filteredReservations])

  const alertSummary = useMemo(function(): string {
    if (!data?.alerts || data.alerts.length === 0) return ''
    const alertTypes = new Set(data.alerts.map(function(a: any) { return a.alert_type }))
    const messages: string[] = []
    if (alertTypes.has('mixed_vaccine_expired')) {
      const count = data.alerts.filter(function(a: any) { return a.alert_type === 'mixed_vaccine_expired' }).length
      messages.push(`混合ワクチン期限切れ ${count}件`)
    }
    if (alertTypes.has('rabies_vaccine_expiring')) {
      const count = data.alerts.filter(function(a: any) { return a.alert_type === 'rabies_vaccine_expiring' }).length
      messages.push(`狂犬病ワクチン期限切れ間近 ${count}件`)
    }
    return messages.join('、') || '確認が必要な項目があります'
  }, [data?.alerts])

  if (loading) {
    return (
      <div className="pb-6">
        <section className="px-5 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
          </div>
          <SkeletonList count={3} type="reservation" />
        </section>
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* ステータスフィルター */}
      <div className="px-5 pt-2 mb-4">
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {FILTER_OPTIONS.map((filter) => {
            const count = filter.id === 'all' ? currentCount : statusCounts[filter.id]
            return (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 relative min-h-[48px] ${
                  statusFilter === filter.id
                    ? `bg-background text-foreground shadow-sm border-b-2 ${filter.borderColor}`
                    : 'text-muted-foreground font-normal'
                }`}
                aria-label={`${filter.label}の予約を表示`}
                aria-pressed={statusFilter === filter.id}
              >
                <iconify-icon icon={filter.icon} width="18" height="18"></iconify-icon>
                {filter.label}{count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 予約リスト */}
      <section className="px-5">
        {filteredReservations.length === 0 ? (
          <EmptyState
            icon={statusFilter === '帰宅済' ? "solar:check-circle-bold" : "solar:calendar-linear"}
            title={statusFilter === 'all' ? '今日の予約はありません' : statusFilter === '帰宅済' ? '帰宅済みのワンちゃんはいません' : `${getStatusLabel(statusFilter)}のワンちゃんはいません`}
            description={statusFilter === 'all' ? '新しい予約を追加して登園スケジュールを管理しましょう' : '他のステータスを確認してください'}
            action={statusFilter === 'all' ? {
              label: '新規予約を追加',
              onClick: () => navigate('/reservations/new'),
              icon: 'solar:add-circle-bold'
            } : undefined}
          />
        ) : (
          <div className="space-y-4">
            {groupedReservations.map(([time, reservations]) => (
              <div key={time}>
                {/* 時間ヘッダー - より大きく目立つように */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-[60px]">
                    <iconify-icon icon="solar:clock-circle-bold" className="size-5 text-primary"></iconify-icon>
                    <span className="text-base font-bold text-foreground">
                      {time}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{reservations.length}件</span>
                </div>

                {/* その時間の予約 - シンプルな展開式カード */}
                <div className="space-y-2">
                  {reservations.map((reservation) => {
                    const displayStatus = getDisplayStatus(reservation)
                    const isWaiting = displayStatus === '来園待ち'
                    const isPresent = displayStatus === '在園中'
                    const isExpanded = expandedCard === reservation.id

                    return (
                      <div
                        key={reservation.id}
                        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
                      >
                        {/* コンパクトなメインカード */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedCard(isExpanded ? null : reservation.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setExpandedCard(isExpanded ? null : reservation.id)
                            }
                          }}
                          className="w-full p-3 flex items-center gap-3 text-left cursor-pointer"
                        >
                          {/* 犬の写真（小さめ） */}
                          <div className="size-10 rounded-full overflow-hidden bg-muted shrink-0">
                            {reservation.dog_photo ? (
                              <img
                                src={reservation.dog_photo}
                                alt={reservation.dog_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <iconify-icon icon="solar:paw-print-bold" className="size-5 text-muted-foreground"></iconify-icon>
                              </div>
                            )}
                          </div>

                          {/* 基本情報のみ */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm">{reservation.dog_name}</h3>
                              {/* 連絡帳バッジ（アイコンのみ） */}
                              {hasPreVisitInput(reservation) && (
                                <iconify-icon icon="solar:clipboard-check-bold" className="size-4 text-chart-3"></iconify-icon>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {reservation.owner_name}様
                            </p>
                          </div>

                          {/* 主アクションボタン1つのみ */}
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isWaiting && (
                              <button
                                onClick={() => handleCheckIn(reservation.id)}
                                disabled={checkingIn === reservation.id}
                                className="flex items-center gap-1 bg-chart-4 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 min-h-[40px]"
                              >
                                {checkingIn === reservation.id ? (
                                  <iconify-icon icon="solar:spinner-bold" className="size-4 animate-spin"></iconify-icon>
                                ) : (
                                  <iconify-icon icon="solar:check-circle-bold" className="size-4"></iconify-icon>
                                )}
                                チェックイン
                              </button>
                            )}
                            {isPresent && (
                              <button
                                onClick={() => navigate(`/journals/create/${reservation.id}`)}
                                className="flex items-center gap-1 bg-chart-2 text-white px-3 py-2 rounded-lg text-xs font-bold min-h-[40px]"
                                aria-label="日誌を作成"
                              >
                                <iconify-icon icon="solar:pen-new-square-bold" className="size-4"></iconify-icon>
                                日誌
                              </button>
                            )}
                            {displayStatus === '帰宅済' && (
                              <div className="flex items-center gap-1 text-chart-3 px-2 py-1">
                                <iconify-icon icon="solar:check-circle-bold" className="size-5"></iconify-icon>
                                <span className="text-xs font-bold">帰宅済</span>
                              </div>
                            )}
                          </div>

                          {/* 展開アイコン */}
                          <iconify-icon
                            icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                            className="size-5 text-muted-foreground shrink-0"
                          ></iconify-icon>
                        </div>

                        {/* 展開時の詳細 */}
                        {isExpanded && (
                          <div className="border-t border-border">
                            {/* 連絡帳（あれば） */}
                            {hasPreVisitInput(reservation) && (
                              <div className="bg-chart-3/5 px-4 py-3">
                                <p className="text-xs font-bold text-chart-3 mb-1">
                                  <iconify-icon icon="solar:clipboard-text-bold" className="size-4 mr-1"></iconify-icon>
                                  飼い主さんからの連絡
                                </p>
                                {reservation.health_status && (
                                  <p className="text-xs text-foreground">{reservation.health_status}</p>
                                )}
                                {reservation.notes && (
                                  <p className="text-xs text-foreground">{reservation.notes}</p>
                                )}
                                {reservation.breakfast_status && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    朝ごはん: {reservation.breakfast_status}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* ステータス情報 */}
                            <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                isPresent ? 'bg-chart-2/10 text-chart-2 border border-chart-2/30' :
                                isWaiting ? 'bg-chart-4/10 text-chart-4 border border-chart-4/30' :
                                'bg-muted text-muted-foreground border border-border'
                              }`}>
                                {displayStatus === '来園待ち' && (
                                  <iconify-icon icon="solar:clock-circle-bold" className="size-3 mr-1"></iconify-icon>
                                )}
                                {displayStatus === '在園中' && (
                                  <iconify-icon icon="solar:home-smile-bold" className="size-3 mr-1"></iconify-icon>
                                )}
                                {displayStatus === '帰宅済' && (
                                  <iconify-icon icon="solar:check-circle-bold" className="size-3 mr-1"></iconify-icon>
                                )}
                                {getStatusLabel(displayStatus)}
                              </span>
                              {reservation.checked_in_at && (
                                <span className="text-chart-2">
                                  {new Date(reservation.checked_in_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 到着
                                </span>
                              )}
                            </div>

                            {/* その他のアクション */}
                            <div className="flex border-t border-border">
                              <button
                                onClick={() => navigate(`/reservations/${reservation.id}`)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted"
                              >
                                <iconify-icon icon="solar:calendar-bold" className="size-4"></iconify-icon>
                                予約詳細
                              </button>
                              <div className="w-px bg-border" />
                              <button
                                onClick={() => navigate(`/dogs/${reservation.dog_id}`)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted"
                              >
                                <iconify-icon icon="solar:document-text-bold" className="size-4"></iconify-icon>
                                カルテ
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* クイックアクション */}
      {data && (
        <section className="px-5 mt-4 space-y-2">
          {/* 今日の点検記録 */}
          <button
            onClick={() => navigate('/inspection-records')}
            className={`w-full border rounded-xl p-3 flex items-center gap-3 transition-colors ${
              data?.todayInspectionRecord
                ? 'bg-chart-2/10 border-chart-2/20 hover:bg-chart-2/15'
                : 'bg-chart-5/10 border-chart-5/20 hover:bg-chart-5/15'
            }`}
          >
            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
              data?.todayInspectionRecord
                ? 'bg-chart-2/20'
                : 'bg-chart-5/20'
            }`}>
              <iconify-icon
                icon={data?.todayInspectionRecord ? 'solar:check-circle-bold' : 'solar:clipboard-check-bold'}
                className={`size-5 ${data?.todayInspectionRecord ? 'text-chart-2' : 'text-chart-5'}`}
              ></iconify-icon>
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-bold ${data?.todayInspectionRecord ? 'text-chart-2' : 'text-chart-5'}`}>
                今日の点検記録
              </p>
              <p className="text-xs text-muted-foreground">
                {data?.todayInspectionRecord ? '入力済み（タップして確認・編集）' : '点検記録を入力してください'}
              </p>
            </div>
            <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0"></iconify-icon>
          </button>

          {/* 未入力の日誌 */}
          {data?.incompleteJournals && data.incompleteJournals.length > 0 && (
            <button
              onClick={() => navigate('/journals/new')}
              className="w-full bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-3 hover:bg-destructive/15 transition-colors"
            >
              <div className="size-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:document-text-bold" className="size-5 text-destructive"></iconify-icon>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-destructive">未入力の日誌</p>
                <p className="text-xs text-muted-foreground">
                  {data.incompleteJournals.slice(0, 2).map((j: any) => j.dog_name).join('、')}
                  {data.incompleteJournals.length > 2 && ` 他${data.incompleteJournals.length - 2}件`}
                </p>
              </div>
              <div className="flex items-center justify-center bg-destructive text-white text-xs font-bold size-7 rounded-full shrink-0">
                {data.incompleteJournals.length}
              </div>
              <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0"></iconify-icon>
            </button>
          )}

          {/* お知らせ発信 */}
          <button
            onClick={() => navigate('/announcements')}
            className="w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3 hover:bg-primary/15 transition-colors"
          >
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <iconify-icon icon="solar:mailbox-bold" className="size-5 text-primary"></iconify-icon>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-primary">お知らせ発信</p>
              <p className="text-xs text-muted-foreground">
                公開中: {data?.announcementStats?.published || 0}件 / 下書き: {data?.announcementStats?.draft || 0}件
              </p>
            </div>
            <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0"></iconify-icon>
          </button>

          {/* 確認事項 */}
          {data?.alerts && data.alerts.length > 0 && (
            <button
              onClick={() => setAlertsModalOpen(true)}
              className="w-full bg-chart-4/10 border border-chart-4/20 rounded-xl p-3 flex items-center gap-3 hover:bg-chart-4/15 transition-colors"
              aria-label="確認事項を表示"
            >
              <div className="size-10 rounded-full bg-chart-4/20 flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:bell-bold" className="size-5 text-chart-4"></iconify-icon>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-chart-4">確認事項</p>
                <p className="text-xs text-muted-foreground">
                  {alertSummary}
                </p>
              </div>
              <div className="flex items-center justify-center bg-chart-4 text-white text-xs font-bold size-7 rounded-full shrink-0">
                {data.alerts.length}
              </div>
              <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0"></iconify-icon>
            </button>
          )}
        </section>
      )}

      {/* 確認事項モーダル */}
      <AlertsModal isOpen={alertsModalOpen} onClose={() => setAlertsModalOpen(false)} />
    </div>
  )
}

export default Dashboard
