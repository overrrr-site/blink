import { Icon } from '../Icon'
import type { ConcernEntry } from '../../types/trainingProfile'
import TrainingEntryList from './TrainingEntryList'
import { useTrainingEntryActions } from './useTrainingEntryActions'

interface ConcernSectionProps {
  concerns: ConcernEntry[]
  dogId: string
  onMutate: () => void
}

function ConcernSection({ concerns, dogId, onMutate }: ConcernSectionProps) {
  const actions = useTrainingEntryActions({
    mode: 'concern',
    dogId,
    onMutate,
  })

  return (
    <TrainingEntryList
      header={(
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Icon icon="solar:danger-triangle-bold" width="14" height="14" />
          </span>
          <h3 className="text-sm font-bold">犬の様子で気になること</h3>
        </div>
      )}
      entries={concerns}
      addPlaceholder="気になることを入力..."
      addButtonLabel="追加"
      containerClassName="border-destructive/20"
      headerClassName="bg-gradient-to-r from-destructive/10 via-transparent to-transparent"
      addButtonClassName="text-destructive hover:bg-destructive/10 active:bg-destructive/15"
      actions={actions}
    />
  )
}

export default ConcernSection
