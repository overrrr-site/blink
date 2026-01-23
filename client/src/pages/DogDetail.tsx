import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { calculateAge, getVaccineAlerts } from '../utils/dog'
import HealthInfoSection from '../components/dogs/HealthInfoSection'
import PersonalitySection from '../components/dogs/PersonalitySection'
import ContractsSection from '../components/dogs/ContractsSection'
import HistoryTabs from '../components/dogs/HistoryTabs'
import { useDogDetail } from '../hooks/useDogDetail'

const DogDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [historyTab, setHistoryTab] = useState<'reservations' | 'journals'>('reservations')
  const { dog, loading, contracts, loadingContracts } = useDogDetail(id)

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
        <p className="text-muted-foreground">犬が見つかりません</p>
      </div>
    )
  }

  const vaccineAlerts = getVaccineAlerts(dog?.health)

  return (
    <div className="space-y-4 pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
            aria-label="戻る"
          >
            <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
          </button>
          <h1 className="text-lg font-bold font-heading">ワンちゃん詳細</h1>
        </div>
        <button
          onClick={() => navigate(`/dogs/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 text-primary font-bold rounded-xl active:bg-primary/10 transition-colors min-h-[44px]"
          aria-label="編集"
        >
          <iconify-icon icon="solar:pen-bold" width="20" height="20"></iconify-icon>
          <span className="text-sm">編集</span>
        </button>
      </header>

      {/* ワクチン警告バナー - 画面上部に固定表示 */}
      {vaccineAlerts.length > 0 && (
        <div className="sticky top-[57px] z-10 px-5 pt-2">
          {vaccineAlerts.map((alert, index) => (
            <div
              key={alert.type}
              className={`mb-2 rounded-xl p-3 border-2 ${
                alert.status.status === 'expired'
                  ? 'bg-destructive/10 border-destructive/30'
                  : alert.status.status === 'warning'
                  ? 'bg-chart-4/10 border-chart-4/30'
                  : 'bg-chart-4/5 border-chart-4/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <iconify-icon
                  icon="solar:danger-triangle-bold"
                  className={`size-5 ${
                    alert.status.status === 'expired' ? 'text-destructive' : 'text-chart-4'
                  }`}
                ></iconify-icon>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {alert.label}の確認が必要です
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.status.status === 'expired'
                      ? `${alert.status.days}日超過しています`
                      : `あと${alert.status.days}日で期限切れです`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="px-5 space-y-4">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            {dog.photo_url ? (
              <img
                src={dog.photo_url}
                alt={dog.name}
                className="size-20 rounded-full object-cover"
              />
            ) : (
              <div className="size-20 rounded-full bg-muted flex items-center justify-center">
                <iconify-icon
                  icon="solar:paw-print-bold"
                  className="size-10 text-muted-foreground"
                ></iconify-icon>
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

        {dog.health && <HealthInfoSection health={dog.health} />}

        {dog.personality && <PersonalitySection personality={dog.personality} />}

        <ContractsSection
          dogId={id || ''}
          contracts={contracts}
          loading={loadingContracts}
          onCreate={() => navigate(`/dogs/${id}/contracts/new`)}
          onSelect={(contractId) => navigate(`/dogs/${id}/contracts/${contractId}`)}
        />

        <HistoryTabs
          activeTab={historyTab}
          reservations={dog.reservations || []}
          journals={dog.journals || []}
          onTabChange={setHistoryTab}
          onOpenReservation={(reservationId) => navigate(`/reservations/${reservationId}`)}
          onOpenJournal={(journalId) => navigate(`/journals/${journalId}`)}
        />
      </main>
    </div>
  )
}

export default DogDetail
