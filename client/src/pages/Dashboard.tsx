import { useEffect, useState } from 'react'
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
  status: '予定' | 'チェックイン済' | 'キャンセル'
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

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [checkingIn, setCheckingIn] = useState<number | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [alertsModalOpen, setAlertsModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard')
      setData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (reservationId: number) => {
    setCheckingIn(reservationId)
    try {
      await api.put(`/reservations/${reservationId}`, {
        status: 'チェックイン済',
      })
      await fetchDashboard()
    } catch (error) {
      console.error('Error checking in:', error)
      alert('チェックインに失敗しました')
    } finally {
      setCheckingIn(null)
    }
  }

  // ステータスの内部値（フィルタリング用）
  const getDisplayStatus = (reservation: Reservation): '来園待ち' | '在園中' | '帰宅済' => {
    if (reservation.status === 'チェックイン済') {
      // 簡易的に、チェックインから8時間経過していれば帰宅済とする
      if (reservation.checked_in_at) {
        const checkedInTime = new Date(reservation.checked_in_at)
        const now = new Date()
        const hoursDiff = (now.getTime() - checkedInTime.getTime()) / (1000 * 60 * 60)
        if (hoursDiff > 8) return '帰宅済'
      }
      return '在園中'
    }
    return '来園待ち'
  }

  // ステータスの表示名（UI表示用）
  const getStatusLabel = (status: '来園待ち' | '在園中' | '帰宅済'): string => {
    switch (status) {
      case '来園待ち': return '登園前'
      case '在園中': return '利用中'
      case '帰宅済': return '帰宅済み'
    }
  }

  // フィルタリング
  const filteredReservations = data?.todayReservations.filter((r) => {
    if (r.status === 'キャンセル') return false
    if (statusFilter === 'all') return true
    return getDisplayStatus(r) === statusFilter
  }) || []

  // ステータス別のカウント
  const statusCounts = {
    '来園待ち': data?.todayReservations.filter((r) => r.status !== 'キャンセル' && getDisplayStatus(r) === '来園待ち').length || 0,
    '在園中': data?.todayReservations.filter((r) => r.status !== 'キャンセル' && getDisplayStatus(r) === '在園中').length || 0,
    '帰宅済': data?.todayReservations.filter((r) => r.status !== 'キャンセル' && getDisplayStatus(r) === '帰宅済').length || 0,
  }

  // 受入状況の計算
  const capacity = data?.capacity || 15
  const currentCount = data?.todayReservations.filter((r) => r.status !== 'キャンセル').length || 0

  // 連絡帳があるかチェック
  const hasPreVisitInput = (reservation: Reservation) => {
    return reservation.notes || reservation.health_status || reservation.breakfast_status
  }

  // 時間でグループ化
  const groupByTime = (reservations: Reservation[]) => {
    const groups: { [key: string]: Reservation[] } = {}
    reservations.forEach((r) => {
      const time = r.reservation_time.slice(0, 5) // HH:MM形式
      if (!groups[time]) groups[time] = []
      groups[time].push(r)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }

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
            {groupByTime(filteredReservations).map(([time, reservations]) => (
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

      {/* アラートバナー - 画面上部に固定表示 */}
      {(data?.incompleteJournals && data.incompleteJournals.length > 0) || 
       (data?.alerts && data.alerts.length > 0) || 
       !data?.todayInspectionRecord ? (
        <section className="px-5 mt-4 space-y-2">
          {/* 今日の点検記録 */}
          {!data?.todayInspectionRecord && (
            <button
              onClick={() => navigate('/inspection-records')}
              className="w-full bg-chart-5/10 border border-chart-5/20 rounded-xl p-3 flex items-center gap-3 hover:bg-chart-5/15 transition-colors"
            >
              <div className="size-10 rounded-full bg-chart-5/20 flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:clipboard-check-bold" className="size-5 text-chart-5"></iconify-icon>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-chart-5">今日の点検記録</p>
                <p className="text-xs text-muted-foreground">点検記録を入力してください</p>
              </div>
              <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0"></iconify-icon>
            </button>
          )}

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
                  {data.alerts[0]?.dog_name}のワクチン確認など
                </p>
              </div>
              <div className="flex items-center justify-center bg-chart-4 text-white text-xs font-bold size-7 rounded-full shrink-0">
                {data.alerts.length}
              </div>
              <iconify-icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0"></iconify-icon>
            </button>
          )}
        </section>
      ) : null}

      {/* 確認事項モーダル */}
      <AlertsModal isOpen={alertsModalOpen} onClose={() => setAlertsModalOpen(false)} />
    </div>
  )
}

export default Dashboard
