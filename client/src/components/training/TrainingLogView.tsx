import { Icon } from '../Icon'
import TrainingEntryList from './TrainingEntryList'
import { useTrainingEntryActions } from './useTrainingEntryActions'
import type { TrainingProfileCategory, LogEntry } from '../../types/trainingProfile'

interface TrainingLogViewProps {
  category: TrainingProfileCategory
  entries: LogEntry[]
  dogId: string
  visualIndex?: number
  onMutate: () => void
}

const LOG_VISUALS = [
  {
    icon: 'solar:notes-bold',
    iconClass: 'bg-chart-4/15 text-chart-4',
    containerClass: 'border-chart-4/20',
    headerClass: 'bg-gradient-to-r from-chart-4/10 via-transparent to-transparent',
    addButtonClass: 'text-chart-4 hover:bg-chart-4/10 active:bg-chart-4/15',
  },
  {
    icon: 'solar:paw-print-bold',
    iconClass: 'bg-chart-3/15 text-chart-3',
    containerClass: 'border-chart-3/20',
    headerClass: 'bg-gradient-to-r from-chart-3/10 via-transparent to-transparent',
    addButtonClass: 'text-chart-3 hover:bg-chart-3/10 active:bg-chart-3/15',
  },
  {
    icon: 'solar:heart-bold',
    iconClass: 'bg-chart-2/15 text-chart-2',
    containerClass: 'border-chart-2/20',
    headerClass: 'bg-gradient-to-r from-chart-2/10 via-transparent to-transparent',
    addButtonClass: 'text-chart-2 hover:bg-chart-2/10 active:bg-chart-2/15',
  },
] as const

function TrainingLogView({ category, entries, dogId, visualIndex = 0, onMutate }: TrainingLogViewProps) {
  const categoryEntries = entries.filter((e) => e.category_id === category.id)
  const actions = useTrainingEntryActions({
    mode: 'log',
    dogId,
    categoryId: category.id,
    onMutate,
  })
  const visual = LOG_VISUALS[Math.abs(visualIndex) % LOG_VISUALS.length]

  return (
    <TrainingEntryList
      header={(
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg ${visual.iconClass}`}>
            <Icon icon={visual.icon} width="14" height="14" />
          </span>
          <div>
            <h3 className="text-sm font-bold">{category.name}</h3>
            {category.goal && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{category.goal}</p>
            )}
          </div>
        </div>
      )}
      entries={categoryEntries}
      addPlaceholder="記録を入力..."
      addButtonLabel="エントリーを追加"
      containerClassName={visual.containerClass}
      headerClassName={visual.headerClass}
      addButtonClassName={visual.addButtonClass}
      actions={actions}
    />
  )
}

export default TrainingLogView
