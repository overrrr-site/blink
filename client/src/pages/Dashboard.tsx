import React, { useCallback, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import AlertsModal from '../components/AlertsModal'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { getAvatarUrl } from '../utils/image'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'

interface Reservation {
  id: number
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  reservation_date: string
  reservation_time: string
  status: '予定' | '登園済' | '降園済' | 'キャンセル'
  checked_in_at?: string
  has_journal?: boolean
  // 連絡帳（飼い主からの入力）
  pvi_morning_urination?: boolean
  pvi_morning_defecation?: boolean
  breakfast_status?: string
  health_status?: string
  notes?: string
}

interface IncompleteJournal {
  reservation_id: number
  reservation_date: string
  journal_date: string
  reservation_time: string
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  journal_id: number | null
  comment: string | null
}

interface DashboardAlert {
  dog_id: number
  dog_name: string
  dog_gender?: string
  owner_name: string
  alert_type: 'mixed_vaccine_expired' | 'rabies_vaccine_expiring'
  mixed_vaccine_date?: string
}

interface InspectionRecord {
  id: number
  store_id: number
  inspection_date: string
  [key: string]: unknown
}

interface DashboardData {
  todayReservations: Reservation[]
  incompleteJournals: IncompleteJournal[]
  alerts: DashboardAlert[]
  todayInspectionRecord: InspectionRecord | null
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
  if (reservation.status === '降園済') {
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

const ReservationCard = React.memo(function ReservationCard({
  reservation,
  isExpanded,
  onToggle,
  onCheckIn,
  onCheckOut,
  onNavigateReservation,
  onNavigateDog,
  onNavigateJournal,
  checkingIn,
}: {
  reservation: Reservation
  isExpanded: boolean
  onToggle: () => void
  onCheckIn: (id: number) => void
  onCheckOut: (id: number) => void
  onNavigateReservation: (id: number) => void
  onNavigateDog: (id: number) => void
  onNavigateJournal: (id: number) => void
  checkingIn: number | null
}) {
  const displayStatus = getDisplayStatus(reservation)
  const isWaiting = displayStatus === '来園待ち'
  const isPresent = displayStatus === '在園中'

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className="w-full p-3 flex items-center gap-3 text-left cursor-pointer"
      >
        <div className="size-10 rounded-full overflow-hidden bg-muted shrink-0">
          {reservation.dog_photo ? (
            <img
              src={getAvatarUrl(reservation.dog_photo)}
              alt={reservation.dog_name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon="solar:paw-print-bold" className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">{reservation.dog_name}</h3>
            {hasPreVisitInput(reservation) && (
              <Icon icon="solar:clipboard-check-bold" className="size-4 text-chart-3" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {reservation.owner_name}様
          </p>
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {isWaiting && (
            <button
              onClick={() => onCheckIn(reservation.id)}
              disabled={checkingIn === reservation.id}
              className="flex items-center gap-1 bg-chart-4 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 min-h-[40px]"
            >
              {checkingIn === reservation.id ? (
                <Icon icon="solar:spinner-bold" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:check-circle-bold" className="size-4" />
              )}
              登園
            </button>
          )}
          {isPresent && !reservation.has_journal && (
            <button
              onClick={() => onNavigateJournal(reservation.id)}
              className="flex items-center gap-1 bg-chart-2 text-white px-3 py-2 rounded-lg text-xs font-bold min-h-[40px]"
              aria-label="日誌を作成"
            >
              <Icon icon="solar:pen-new-square-bold" className="size-4" />
              日誌
            </button>
          )}
          {isPresent && reservation.has_journal && (
            <button
              onClick={() => onCheckOut(reservation.id)}
              disabled={checkingIn === reservation.id}
              className="flex items-center gap-1 bg-chart-3 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 min-h-[40px]"
              aria-label="降園"
            >
              {checkingIn === reservation.id ? (
                <Icon icon="solar:spinner-bold" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:logout-3-bold" className="size-4" />
              )}
              降園
            </button>
          )}
          {displayStatus === '帰宅済' && (
            <div className="flex items-center gap-1 text-chart-3 px-2 py-1">
              <Icon icon="solar:check-circle-bold" className="size-5" />
              <span className="text-xs font-bold">帰宅済</span>
            </div>
          )}
        </div>

        <Icon icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
          className="size-5 text-muted-foreground shrink-0" />
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {hasPreVisitInput(reservation) && (
            <div className="bg-chart-3/5 px-4 py-3">
              <p className="text-xs font-bold text-chart-3 mb-1">
                <Icon icon="solar:clipboard-text-bold" className="size-4 mr-1" />
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

          <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
              isPresent ? 'bg-chart-2/10 text-chart-2 border border-chart-2/30' :
              isWaiting ? 'bg-chart-4/10 text-chart-4 border border-chart-4/30' :
              'bg-muted text-muted-foreground border border-border'
            }`}>
              {displayStatus === '来園待ち' && (
                <Icon icon="solar:clock-circle-bold" className="size-3 mr-1" />
              )}
              {displayStatus === '在園中' && (
                <Icon icon="solar:home-smile-bold" className="size-3 mr-1" />
              )}
              {displayStatus === '帰宅済' && (
                <Icon icon="solar:check-circle-bold" className="size-3 mr-1" />
              )}
              {getStatusLabel(displayStatus)}
            </span>
            {reservation.checked_in_at && (
              <span className="text-chart-2">
                {new Date(reservation.checked_in_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 到着
              </span>
            )}
          </div>

          <div className="flex border-t border-border">
            <button
              onClick={() => onNavigateReservation(reservation.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted"
            >
              <Icon icon="solar:calendar-bold" className="size-4" />
              予約詳細
            </button>
            <div className="w-px bg-border" />
            <button
              onClick={() => onNavigateDog(reservation.dog_id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:bg-muted/50 min-h-[48px] active:bg-muted"
            >
              <Icon icon="solar:document-text-bold" className="size-4" />
              カルテ
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

const QuickActionCard = React.memo(function QuickActionCard({
  onClick,
  icon,
  iconClassName,
  containerClassName,
  title,
  titleClassName,
  description,
  badge,
}: {
  onClick: () => void
  icon: string
  iconClassName: string
  containerClassName: string
  title: string
  titleClassName: string
  description: string
  badge?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full border rounded-xl p-3 flex items-center gap-3 transition-colors ${containerClassName}`}
    >
      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${iconClassName}`}>
        <Icon icon={icon} className="size-5" />
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-bold ${titleClassName}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {badge}
      <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0" />
    </button>
  )
})

function Dashboard(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [checkingIn, setCheckingIn] = useState<number | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [alertsModalOpen, setAlertsModalOpen] = useState(false)
  const navigate = useNavigate()

  const { data, isLoading, mutate } = useSWR<DashboardData>('/dashboard', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000,
  })

  const handleCheckIn = useCallback(async function(reservationId: number): Promise<void> {
    setCheckingIn(reservationId)
    try {
      await api.put(`/reservations/${reservationId}`, {
        status: '登園済',
      })
      await mutate()
    } catch {
      alert('登園処理に失敗しました')
    } finally {
      setCheckingIn(null)
    }
  }, [mutate])

  const handleCheckOut = useCallback(async function(reservationId: number): Promise<void> {
    setCheckingIn(reservationId)
    try {
      await api.put(`/reservations/${reservationId}`, {
        status: '降園済',
      })
      await mutate()
    } catch {
      alert('降園処理に失敗しました')
    } finally {
      setCheckingIn(null)
    }
  }, [mutate])

  const handleNavigateReservation = useCallback((id: number) => {
    navigate(`/reservations/${id}`)
  }, [navigate])

  const handleNavigateDog = useCallback((id: number) => {
    navigate(`/dogs/${id}`)
  }, [navigate])

  const handleNavigateJournalCreate = useCallback((id: number) => {
    navigate(`/journals/create/${id}`)
  }, [navigate])

  const handleNavigateInspection = useCallback(() => {
    navigate('/inspection-records')
  }, [navigate])

  const handleNavigateAnnouncements = useCallback(() => {
    navigate('/announcements')
  }, [navigate])

  const handleNavigateNewJournals = useCallback(() => {
    navigate('/journals/new')
  }, [navigate])

  const handleNavigateNewReservation = useCallback(() => {
    navigate('/reservations/new')
  }, [navigate])

  const handleToggleAlerts = useCallback(() => {
    setAlertsModalOpen(true)
  }, [])

  const handleToggleCard = useCallback((id: number) => {
    setExpandedCard((prev) => (prev === id ? null : id))
  }, [])

  const handleHideAlerts = useCallback(() => {
    setAlertsModalOpen(false)
  }, [])

  // 4つの計算を1回のループで統合処理（パフォーマンス最適化）
  const { statusCounts, currentCount, filteredReservations, groupedReservations } = useMemo(function() {
    const reservations = data?.todayReservations || []
    const counts: Record<DisplayStatus, number> = { '来園待ち': 0, '在園中': 0, '帰宅済': 0 }
    const groups: Record<string, Reservation[]> = {}
    const filtered: Reservation[] = []

    for (const r of reservations) {
      if (r.status === 'キャンセル') continue
      const displayStatus = getDisplayStatus(r)
      counts[displayStatus]++

      if (statusFilter === 'all' || displayStatus === statusFilter) {
        filtered.push(r)
        const time = r.reservation_time.slice(0, 5)
        if (!groups[time]) groups[time] = []
        groups[time].push(r)
      }
    }

    return {
      statusCounts: counts,
      currentCount: counts['来園待ち'] + counts['在園中'] + counts['帰宅済'],
      filteredReservations: filtered,
      groupedReservations: Object.entries(groups).sort(function([a], [b]) {
        return a.localeCompare(b)
      }) as [string, Reservation[]][]
    }
  }, [data?.todayReservations, statusFilter])

  const alertSummary = useMemo(function(): string {
    if (!data?.alerts || data.alerts.length === 0) return ''
    const alertTypes = new Set(data.alerts.map(function(a) { return a.alert_type }))
    const messages: string[] = []
    if (alertTypes.has('mixed_vaccine_expired')) {
      const count = data.alerts.filter(function(a) { return a.alert_type === 'mixed_vaccine_expired' }).length
      messages.push(`混合ワクチン期限切れ ${count}件`)
    }
    if (alertTypes.has('rabies_vaccine_expiring')) {
      const count = data.alerts.filter(function(a) { return a.alert_type === 'rabies_vaccine_expiring' }).length
      messages.push(`狂犬病ワクチン期限切れ間近 ${count}件`)
    }
    return messages.join('、') || '確認が必要な項目があります'
  }, [data?.alerts])

  if (isLoading) {
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
        <div className="flex bg-muted rounded-xl p-1 gap-0.5">
          {FILTER_OPTIONS.map((filter) => {
            const count = filter.id === 'all' ? currentCount : statusCounts[filter.id]
            return (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex-1 py-2.5 px-1 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-0.5 relative min-h-[44px] ${
                  statusFilter === filter.id
                    ? `bg-background text-foreground shadow-sm border-b-2 ${filter.borderColor}`
                    : 'text-muted-foreground font-normal'
                }`}
                aria-label={`${filter.label}の予約を表示`}
                aria-pressed={statusFilter === filter.id}
              >
                <Icon icon={filter.icon} width="16" height="16" />
                <span className="whitespace-nowrap">{filter.label}</span>
                {count > 0 && <span className="text-[10px] opacity-70 hidden sm:inline">({count})</span>}
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
              onClick: handleNavigateNewReservation,
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
                    <Icon icon="solar:clock-circle-bold" className="size-5 text-primary" />
                    <span className="text-base font-bold text-foreground">
                      {time}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{reservations.length}件</span>
                </div>

                {/* その時間の予約 - シンプルな展開式カード */}
                <div className="space-y-2">
                  {reservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      isExpanded={expandedCard === reservation.id}
                      onToggle={() => handleToggleCard(reservation.id)}
                      onCheckIn={handleCheckIn}
                      onCheckOut={handleCheckOut}
                      onNavigateReservation={handleNavigateReservation}
                      onNavigateDog={handleNavigateDog}
                      onNavigateJournal={handleNavigateJournalCreate}
                      checkingIn={checkingIn}
                    />
                  ))}
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
          <QuickActionCard
            onClick={handleNavigateInspection}
            icon={data?.todayInspectionRecord ? 'solar:check-circle-bold' : 'solar:clipboard-check-bold'}
            iconClassName={data?.todayInspectionRecord ? 'bg-chart-2/20 text-chart-2' : 'bg-chart-5/20 text-chart-5'}
            containerClassName={data?.todayInspectionRecord ? 'bg-chart-2/10 border-chart-2/20 hover:bg-chart-2/15' : 'bg-chart-5/10 border-chart-5/20 hover:bg-chart-5/15'}
            title="今日の点検記録"
            titleClassName={data?.todayInspectionRecord ? 'text-chart-2' : 'text-chart-5'}
            description={data?.todayInspectionRecord ? '入力済み（タップして確認・編集）' : '点検記録を入力してください'}
          />

          {/* 未入力の日誌 */}
          {data?.incompleteJournals && data.incompleteJournals.length > 0 && (
            <QuickActionCard
              onClick={handleNavigateNewJournals}
              icon="solar:document-text-bold"
              iconClassName="bg-destructive/20 text-destructive"
              containerClassName="bg-destructive/10 border-destructive/20 hover:bg-destructive/15"
              title="未入力の日誌"
              titleClassName="text-destructive"
              description={`${data.incompleteJournals.slice(0, 2).map((j) => j.dog_name).join('、')}${data.incompleteJournals.length > 2 ? ` 他${data.incompleteJournals.length - 2}件` : ''}`}
              badge={(
                <div className="flex items-center justify-center bg-destructive text-white text-xs font-bold size-7 rounded-full shrink-0">
                  {data.incompleteJournals.length}
                </div>
              )}
            />
          )}

          {/* お知らせ発信 */}
          <QuickActionCard
            onClick={handleNavigateAnnouncements}
            icon="solar:mailbox-bold"
            iconClassName="bg-primary/20 text-primary"
            containerClassName="bg-primary/10 border-primary/20 hover:bg-primary/15"
            title="お知らせ発信"
            titleClassName="text-primary"
            description={`公開中: ${data?.announcementStats?.published || 0}件 / 下書き: ${data?.announcementStats?.draft || 0}件`}
          />

          {/* 確認事項 */}
          {data?.alerts && data.alerts.length > 0 && (
            <QuickActionCard
              onClick={handleToggleAlerts}
              icon="solar:bell-bold"
              iconClassName="bg-chart-4/20 text-chart-4"
              containerClassName="bg-chart-4/10 border-chart-4/20 hover:bg-chart-4/15"
              title="確認事項"
              titleClassName="text-chart-4"
              description={alertSummary}
              badge={(
                <div className="flex items-center justify-center bg-chart-4 text-white text-xs font-bold size-7 rounded-full shrink-0">
                  {data.alerts.length}
                </div>
              )}
            />
          )}
        </section>
      )}

      {/* 確認事項モーダル */}
      <AlertsModal isOpen={alertsModalOpen} onClose={handleHideAlerts} />
    </div>
  )
}

export default Dashboard
