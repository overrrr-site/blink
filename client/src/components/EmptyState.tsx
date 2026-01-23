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

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="size-24 rounded-full bg-accent/30 flex items-center justify-center mb-6">
        <iconify-icon icon={icon} width="48" height="48" className="text-accent-foreground"></iconify-icon>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          {action.icon && (
            <iconify-icon icon={action.icon} width="20" height="20"></iconify-icon>
          )}
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
