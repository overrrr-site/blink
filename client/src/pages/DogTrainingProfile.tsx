import { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import PageHeader from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { useTrainingProfile } from '../hooks/useTrainingProfile'
import { calculateAge } from '../utils/dog'
import TrainingGridView from '../components/training/TrainingGridView'
import TrainingLogView from '../components/training/TrainingLogView'
import ConcernSection from '../components/training/ConcernSection'
import { LazyImage } from '../components/LazyImage'
import { getDetailThumbnailUrl } from '../utils/image'

interface DogSummary {
  id: number
  name: string
  breed: string
  birth_date: string
  photo_url?: string | null
}

interface StoreSettings {
  training_evaluation_mode?: 'three_step' | 'six_step'
}

const THREE_STEP_SYMBOLS = ['○', '△', '×']
const SIX_STEP_SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F']

const SIX_STEP_GENERIC_LABELS: Record<string, string> = {
  A: '導入段階',
  B: '練習中',
  C: '一部できる',
  D: 'ほぼできる',
  E: '安定してできる',
  F: '定着',
}

function DogTrainingProfile() {
  const { dogId } = useParams<{ dogId: string }>()

  const { data: dog } = useSWR<DogSummary>(
    dogId ? `/dogs/${dogId}` : null,
    fetcher,
  )

  const { data: profileData, isLoading, mutate } = useTrainingProfile(dogId)

  const { data: storeSettings } = useSWR<StoreSettings>('/store-settings', fetcher)

  const handleMutate = useCallback(() => {
    mutate()
  }, [mutate])

  // useMemo must be called before any early returns (React Hooks rule)
  const evaluationMode = storeSettings?.training_evaluation_mode || 'three_step'
  const allLevels = profileData?.achievementLevels ?? []
  const filteredLevels = useMemo(
    () => evaluationMode === 'six_step'
      ? allLevels
        .filter((l) => SIX_STEP_SYMBOLS.includes(l.symbol))
        .map((l) => ({
          ...l,
          label: SIX_STEP_GENERIC_LABELS[l.symbol] ?? l.label,
        }))
      : allLevels.filter((l) => THREE_STEP_SYMBOLS.includes(l.symbol)),
    [allLevels, evaluationMode],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="内部記録" backPath={dogId ? `/dogs/${dogId}` : undefined} />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="内部記録" backPath={dogId ? `/dogs/${dogId}` : undefined} />
        <div className="flex flex-col items-center justify-center py-20">
          <Icon icon="solar:clipboard-remove-bold" width="48" height="48" className="text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">データを取得できませんでした</p>
        </div>
      </div>
    )
  }

  const { categories, gridEntries, logEntries, concerns } = profileData
  const enabledCategories = categories
    .filter((c) => c.enabled)
    .sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="min-h-screen bg-background pb-8">
      <PageHeader title="内部記録" backPath={dogId ? `/dogs/${dogId}` : undefined} />

      {/* Dog summary card */}
      {dog && (
        <div className="mx-4 mt-4 bg-card rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-3">
            {dog.photo_url ? (
              <LazyImage
                src={getDetailThumbnailUrl(dog.photo_url)}
                alt={dog.name}
                className="size-12 rounded-xl"
              />
            ) : (
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon icon="solar:bone-bold" width="20" height="20" className="text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold">{dog.name}</h2>
              <p className="text-xs text-muted-foreground">
                {dog.breed}
                {dog.birth_date && ` ・ ${calculateAge(dog.birth_date)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category sections */}
      <div className="mx-4 mt-4 space-y-4">
        {enabledCategories.map((cat) => {
          if (cat.category_type === 'grid') {
            return (
              <TrainingGridView
                key={cat.id}
                category={cat}
                achievementLevels={filteredLevels}
                entries={gridEntries}
                dogId={dogId!}
                onMutate={handleMutate}
                evaluationMode={evaluationMode}
              />
            )
          }
          return (
            <TrainingLogView
              key={cat.id}
              category={cat}
              entries={logEntries}
              dogId={dogId!}
              onMutate={handleMutate}
            />
          )
        })}

        {/* Concern section */}
        <ConcernSection
          concerns={concerns}
          dogId={dogId!}
          onMutate={handleMutate}
        />
      </div>
    </div>
  )
}

export default DogTrainingProfile
