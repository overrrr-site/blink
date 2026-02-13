import TrainingEntryList from './TrainingEntryList'
import { useTrainingEntryActions } from './useTrainingEntryActions'
import type { TrainingProfileCategory, LogEntry } from '../../types/trainingProfile'

interface TrainingLogViewProps {
  category: TrainingProfileCategory
  entries: LogEntry[]
  dogId: string
  onMutate: () => void
}

function TrainingLogView({ category, entries, dogId, onMutate }: TrainingLogViewProps) {
  const categoryEntries = entries.filter((e) => e.category_id === category.id)
  const actions = useTrainingEntryActions({
    mode: 'log',
    dogId,
    categoryId: category.id,
    onMutate,
  })

  return (
    <TrainingEntryList
      header={(
        <>
          <h3 className="text-sm font-bold">{category.name}</h3>
          {category.goal && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{category.goal}</p>
          )}
        </>
      )}
      entries={categoryEntries}
      addPlaceholder="記録を入力..."
      addButtonLabel="エントリーを追加"
      actions={actions}
    />
  )
}

export default TrainingLogView
