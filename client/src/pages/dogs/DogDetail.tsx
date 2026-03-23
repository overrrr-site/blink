import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import { calculateAge } from '../../utils/dog'
import PageHeader from '../../components/PageHeader'
import HealthInfoSection from '../../components/dogs/HealthInfoSection'
import PersonalitySection from '../../components/dogs/PersonalitySection'
import ContractsSection from '../../components/dogs/ContractsSection'
import HistoryTabs from '../../components/dogs/HistoryTabs'
import { useDogDetail } from '../../hooks/useDogDetail'
import { useBusinessTypeStore } from '../../store/businessTypeStore'
import { LazyImage } from '../../components/LazyImage'
import { getDetailThumbnailUrl } from '../../utils/image'
import CoachMark from '../../components/onboarding/CoachMark'

function IntakeSection({ intake }: { intake: { ai_summary: string; education_plan: { daycare_plan?: string; home_advice?: string; three_month_goals?: string } | null; completed_at: string } }) {
  const [expanded, setExpanded] = useState(false)
  const plan = intake.education_plan

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#6366F11A' }}>
          <Icon icon="solar:chat-round-dots-bold" width="20" height="20" style={{ color: '#6366F1' }} />
        </div>
        <div>
          <h3 className="text-lg font-bold">初回カウンセリング</h3>
          <p className="text-[11px] text-muted-foreground">
            {new Date(intake.completed_at).toLocaleDateString('ja-JP')} AIチャットで回答
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">トレーナー向け要約</label>
          <p className="text-sm bg-muted/50 rounded-xl p-3 leading-relaxed">{intake.ai_summary}</p>
        </div>

        {plan && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-sm font-bold text-indigo-600 py-2"
          >
            <span>教育プラン</span>
            <Icon
              icon={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
              width="16" height="16"
            />
          </button>
        )}

        {expanded && plan && (
          <div className="space-y-2 text-sm">
            {plan.daycare_plan && (
              <div className="bg-indigo-50 rounded-xl p-3">
                <label className="text-[11px] font-bold text-indigo-600 block mb-1">園での過ごし方</label>
                <p className="text-foreground leading-relaxed">{plan.daycare_plan}</p>
              </div>
            )}
            {plan.home_advice && (
              <div className="bg-indigo-50 rounded-xl p-3">
                <label className="text-[11px] font-bold text-indigo-600 block mb-1">家庭でのアドバイス</label>
                <p className="text-foreground leading-relaxed">{plan.home_advice}</p>
              </div>
            )}
            {plan.three_month_goals && (
              <div className="bg-indigo-50 rounded-xl p-3">
                <label className="text-[11px] font-bold text-indigo-600 block mb-1">3ヶ月目標</label>
                <p className="text-foreground leading-relaxed">{plan.three_month_goals}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DogDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [historyTab, setHistoryTab] = useState<'reservations' | 'records' | 'preVisit'>('reservations')
  const { dog, loading, contracts, loadingContracts } = useDogDetail(id)
  const { selectedBusinessType } = useBusinessTypeStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!dog) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">ワンちゃんが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="ワンちゃん詳細"
        backPath="/customers"
        rightContent={
          <button
            onClick={() => navigate(`/dogs/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 text-primary font-bold rounded-xl active:bg-primary/10 active:scale-[0.98] transition-all min-h-[44px]"
            aria-label="編集"
          >
            <Icon icon="solar:pen-bold" width="20" height="20" />
            <span className="text-sm">編集</span>
          </button>
        }
      />

      <main className="px-5 space-y-4 pt-4 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0">
        {/* Left column (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              {dog.photo_url ? (
                <LazyImage
                  src={getDetailThumbnailUrl(dog.photo_url)}
                  alt={dog.name}
                  className="size-20 rounded-full"
                />
              ) : (
                <div className="size-20 rounded-full bg-muted flex items-center justify-center">
                  <Icon icon="solar:paw-print-bold"
                    className="size-10 text-muted-foreground" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold mb-1">{dog.name}</h2>
                <p className="text-sm text-muted-foreground">{dog.breed}</p>
                <p className="text-xs text-muted-foreground">
                  {calculateAge(dog.birth_date)} / {dog.gender}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4">基本情報</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">生年月日</label>
                <p className="text-base font-medium">
                  {new Date(dog.birth_date).toLocaleDateString('ja-JP')}
                </p>
              </div>
              {dog.weight && (
                <div>
                  <label className="text-xs text-muted-foreground">体重</label>
                  <p className="text-base font-medium">{dog.weight}kg</p>
                </div>
              )}
              {dog.color && (
                <div>
                  <label className="text-xs text-muted-foreground">毛色</label>
                  <p className="text-base font-medium">{dog.color}</p>
                </div>
              )}
              {dog.neutered && (
                <div>
                  <label className="text-xs text-muted-foreground">避妊・去勢</label>
                  <p className="text-base font-medium">
                    {dog.neutered === '済' ? '避妊/去勢済み' : dog.neutered === '未' ? '未実施' : dog.neutered}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 内部記録 */}
          <button
            onClick={() => navigate(`/dogs/${id}/training`)}
            className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon icon="solar:clipboard-list-bold" width="20" height="20" className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">内部記録</h3>
                  <p className="text-[11px] text-muted-foreground">コマンド達成状況・日々の記録</p>
                </div>
              </div>
              <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
            </div>
          </button>

          <ContractsSection
            contracts={contracts}
            loading={loadingContracts}
            onCreate={() => navigate(`/dogs/${id}/contracts/new`)}
            onSelect={(contractId) => navigate(`/dogs/${id}/contracts/${contractId}`)}
          />
        </div>

        {/* Right column (3/5) */}
        <div className="lg:col-span-3 space-y-4">
          {dog.intake && <IntakeSection intake={dog.intake} />}

          {dog.health && <HealthInfoSection health={dog.health} />}

          {dog.personality && <PersonalitySection personality={dog.personality} />}

          <HistoryTabs
            activeTab={historyTab}
            reservations={dog.reservations || []}
            records={dog.records || []}
            preVisitHistory={dog.preVisitHistory || []}
            selectedBusinessType={selectedBusinessType}
            onTabChange={setHistoryTab}
            onOpenReservation={(reservationId) => navigate(`/reservations/${reservationId}`)}
            onOpenRecord={(recordId) => navigate(`/records/${recordId}`)}
          />
        </div>
      </main>

      <CoachMark
        id="tip-history-tab"
        target='[data-coach="history-tabs"]'
        message="過去の来園記録と連絡帳を時系列で確認できます"
      />
    </div>
  )
}

export default DogDetail
