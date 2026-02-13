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
        <div className="flex items-center gap-2">
          <Icon icon="solar:danger-triangle-bold" width="16" height="16" className="text-amber-500" />
          <h3 className="text-sm font-bold">犬の様子で気になること</h3>
        </div>
      )}
      entries={concerns}
      addPlaceholder="気になることを入力..."
      addButtonLabel="追加"
      actions={actions}
    />
  )
}

export default ConcernSection
