import { useState } from 'react'
import { Icon } from '../Icon'
import type { RecentReservation, ReservationDog } from '../../hooks/useReservationCreateData'

type DogSelectStepProps = {
  title: string
  recentDogs: ReservationDog[]
  filteredDogs: ReservationDog[]
  recentReservations: RecentReservation[]
  selectedDogId: number | null
  showRecentOnly: boolean
  searchQuery: string
  onSelectDog: (id: number) => void
  onToggleRecent: () => void
  onSearchChange: (value: string) => void
  onBack: () => void
  onNext: () => void
}

function isMeaningfulText(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !/^\d+$/.test(value.trim()))
}

export default function DogSelectStep({
  title,
  recentDogs,
  filteredDogs,
  recentReservations,
  selectedDogId,
  showRecentOnly,
  searchQuery,
  onSelectDog,
  onToggleRecent,
  onSearchChange,
  onBack,
  onNext,
}: DogSelectStepProps): JSX.Element {
  const [error, setError] = useState('')
  const list = showRecentOnly && !searchQuery ? recentDogs : filteredDogs

  function handleNext(): void {
    if (!selectedDogId) {
      setError('ワンちゃんを選択してください')
      return
    }
    setError('')
    onNext()
  }

  return (
    <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2">
          <Icon icon="solar:paw-print-bold" className="text-primary size-4" />
          {title}
        </h3>
        {recentDogs.length > 0 && (
          <button
            type="button"
            onClick={onToggleRecent}
            className={`text-xs font-bold px-3 py-1.5 rounded-full active:scale-[0.98] transition-all ${
              showRecentOnly
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {showRecentOnly ? 'すべて表示' : '最近の予約'}
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Icon icon="solar:magnifer-linear"
          width="18"
          height="18"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="ワンちゃん名・飼い主名で検索"
          aria-label="ワンちゃん名・飼い主名で検索"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div role="radiogroup" aria-label="ワンちゃんを選択" className="space-y-2 max-h-60 overflow-y-auto">
        {list.map((dog) => {
          const recentReservation = recentReservations.find((r) => r.dog_id === dog.id)
          const breedText = isMeaningfulText(dog.breed) ? dog.breed : '犬種未登録'
          const ownerText = isMeaningfulText(dog.owner_name) ? `${dog.owner_name}様` : '飼い主未登録'
          return (
            <label
              key={dog.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all min-h-[44px] ${
                selectedDogId === dog.id
                  ? 'border-2 border-primary bg-primary/10 shadow-sm'
                  : 'border border-border hover:bg-muted/50 hover:border-primary/30'
              }`}
            >
              <input
                type="radio"
                name="dog"
                value={dog.id}
                checked={selectedDogId === dog.id}
                onChange={() => onSelectDog(dog.id)}
                className="hidden"
              />
              <div className="size-10 rounded-full overflow-hidden border-2 border-transparent shrink-0">
                {dog.photo_url ? (
                  <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Icon icon="solar:paw-print-bold" className="size-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{dog.name}</p>
                  {dog.reservation_count && dog.reservation_count > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      よく利用
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {breedText} / {ownerText}
                  {recentReservation && (
                    <span className="ml-2 text-[9px]">
                      前回:{' '}
                      {new Date(recentReservation.reservation_date).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </p>
              </div>
              {selectedDogId === dog.id ? (
                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                  <Icon icon="solar:check-circle-bold" className="size-4 text-white" />
                </div>
              ) : (
                <div className="size-6 rounded-full border-2 border-border"></div>
              )}
            </label>
          )
        })}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
          <Icon icon="solar:danger-triangle-bold" className="size-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all min-h-[48px]"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[48px]"
        >
          次へ
        </button>
      </div>
    </section>
  )
}
