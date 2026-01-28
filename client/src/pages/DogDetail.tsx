import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import { calculateAge } from '../utils/dog'
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

  return (
    <div className="space-y-4 pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
            aria-label="戻る"
          >
            <Icon icon="solar:arrow-left-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">ワンちゃん詳細</h1>
        </div>
        <button
          onClick={() => navigate(`/dogs/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 text-primary font-bold rounded-xl active:bg-primary/10 transition-colors min-h-[44px]"
          aria-label="編集"
        >
          <Icon icon="solar:pen-bold" width="20" height="20" />
          <span className="text-sm">編集</span>
        </button>
      </header>

      <main className="px-5 space-y-4 pt-4">
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
