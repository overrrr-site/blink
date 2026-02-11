import { Icon } from './Icon'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: string
  }
}

function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="size-24 rounded-full bg-accent/30 flex items-center justify-center mb-6">
        <Icon icon={icon} width="48" height="48" className="text-accent-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
        >
          {action.icon && (
            <Icon icon={action.icon} width="20" height="20" />
          )}
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
