import React, { useCallback, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import AlertsModal from '../components/AlertsModal'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { getDashboardStatusLabels } from '../domain/businessTypeConfig'
import type { RecordType } from '../types/record'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import { useToast } from '../components/Toast'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import ReservationCard, { getDisplayStatus, getStatusLabel } from '../components/ReservationCard'
import type { ReservationCardData } from '../components/ReservationCard'

type Reservation = ReservationCardData

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
  accentColor: string
}

function getFilterOptions(businessType: RecordType | null): FilterConfig[] {
  const l = getDashboardStatusLabels(businessType)

  // トリミングは2ステータスのみ（来店前・完了）
  if (businessType === 'grooming') {
    return [
      { id: 'all', label: 'すべて', icon: 'solar:list-bold', accentColor: 'bg-primary' },
      { id: '来園待ち', label: l.waiting, icon: 'solar:clock-circle-bold', accentColor: 'bg-chart-4' },
      { id: '帰宅済', label: l.done, icon: 'solar:check-circle-bold', accentColor: 'bg-chart-3' },
    ]
  }

  // daycare, hotel は3ステータス
  return [
    { id: 'all', label: 'すべて', icon: 'solar:list-bold', accentColor: 'bg-primary' },
    { id: '来園待ち', label: l.waiting, icon: 'solar:clock-circle-bold', accentColor: 'bg-chart-4' },
    { id: '在園中', label: l.active, icon: 'solar:home-smile-bold', accentColor: 'bg-chart-2' },
    { id: '帰宅済', label: l.done, icon: 'solar:check-circle-bold', accentColor: 'bg-chart-3' },
  ]
}

type DisplayStatus = '来園待ち' | '在園中' | '帰宅済'

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
      className={`w-full border rounded-xl p-3 flex items-center gap-3 transition-all active:scale-[0.98] ${containerClassName}`}
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
  const { showToast } = useToast()
  const {
    effectiveBusinessType,
    recordLabel,
    dashboardEmptyState,
    serviceTypeParam,
  } = useBusinessTypeFilter()
  const currentBusinessType = effectiveBusinessType ?? null

  // 業種に応じたフィルターオプション
  const filterOptions = useMemo(() => getFilterOptions(currentBusinessType), [currentBusinessType])

  // 業種フィルタを含むSWRキー
  const dashboardKey = serviceTypeParam
    ? `/dashboard?${serviceTypeParam}`
    : '/dashboard'

  const { data, isLoading, mutate } = useSWR<DashboardData>(dashboardKey, fetcher, {
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
      showToast('登園処理に失敗しました', 'error')
    } finally {
      setCheckingIn(null)
    }
  }, [mutate, showToast])

  const handleCheckOut = useCallback(async function(reservationId: number): Promise<void> {
    setCheckingIn(reservationId)
    try {
      await api.put(`/reservations/${reservationId}`, {
        status: '降園済',
      })
      await mutate()
    } catch {
      showToast('降園処理に失敗しました', 'error')
    } finally {
      setCheckingIn(null)
    }
  }, [mutate, showToast])

  const handleNavigatePreVisit = useCallback((id: number) => {
    navigate(`/reservations/${id}`)
  }, [navigate])

  const handleNavigateTraining = useCallback((dogId: number) => {
    navigate(`/dogs/${dogId}/training`)
  }, [navigate])

  const handleNavigateRecord = useCallback((id: number) => {
    navigate(`/records/create/${id}`)
  }, [navigate])

  const handleNavigateJournalCreate = useCallback((id: number) => {
    navigate(`/records/create/${id}`)
  }, [navigate])

  const handleNavigateInspection = useCallback(() => {
    navigate('/inspection-records')
  }, [navigate])

  const handleNavigateAnnouncements = useCallback(() => {
    navigate('/announcements')
  }, [navigate])

  const handleNavigateIncompleteRecord = useCallback(() => {
    if (currentBusinessType) {
      navigate(`/records/incomplete?service_type=${currentBusinessType}`)
      return
    }
    navigate('/records/incomplete')
  }, [currentBusinessType, navigate])

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
        <div className="flex bg-muted rounded-xl p-1 gap-2 overflow-x-auto scrollbar-hide">
          {filterOptions.map((filter) => {
            const count = filter.id === 'all' ? currentCount : statusCounts[filter.id]
            return (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex-none py-2.5 px-3 rounded-lg text-[11px] font-bold transition-all inline-flex flex-nowrap items-center justify-center gap-1 relative min-h-[44px] active:scale-[0.98] ${
                  statusFilter === filter.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground font-normal'
                }`}
                aria-label={`${filter.label}の予約を表示`}
                aria-pressed={statusFilter === filter.id}
              >
                <Icon icon={filter.icon} width="16" height="16" className="shrink-0" />
                <span className="whitespace-nowrap">{filter.label}</span>
                {count > 0 && <span className="text-[10px] opacity-70 hidden sm:inline">({count})</span>}
                {statusFilter === filter.id && (
                  <span className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${filter.accentColor}`} />
                )}
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
            title={statusFilter === 'all'
              ? dashboardEmptyState.title
              : statusFilter === '帰宅済'
                ? '帰宅済みのワンちゃんはいません'
                : `${getStatusLabel(statusFilter, currentBusinessType)}のワンちゃんはいません`}
            description={statusFilter === 'all'
              ? dashboardEmptyState.description
              : '他のステータスを確認してください'}
            action={statusFilter === 'all'
              ? {
                label: dashboardEmptyState.actionLabel,
                onClick: handleNavigateNewReservation,
                icon: 'solar:add-circle-bold'
              }
              : undefined}
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
                      onNavigatePreVisit={handleNavigatePreVisit}
                      onNavigateTraining={handleNavigateTraining}
                      onNavigateRecord={handleNavigateRecord}
                      onNavigateJournal={handleNavigateJournalCreate}
                      checkingIn={checkingIn}
                      recordLabel={recordLabel}
                      businessType={currentBusinessType}
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

          {/* 未入力のカルテ/連絡帳 */}
          {data?.incompleteJournals && data.incompleteJournals.length > 0 && (
            <QuickActionCard
              onClick={handleNavigateIncompleteRecord}
              icon="solar:clipboard-text-bold"
              iconClassName="bg-destructive/20 text-destructive"
              containerClassName="bg-destructive/10 border-destructive/20 hover:bg-destructive/15"
              title={`未入力の${recordLabel}`}
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
