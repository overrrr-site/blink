import React from 'react'
import { Icon } from '../Icon'

interface QuickActionCardProps {
  onClick: () => void
  icon: string
  iconClassName: string
  containerClassName: string
  title: string
  titleClassName: string
  description: string
  badge?: React.ReactNode
}

const QuickActionCard = React.memo(function QuickActionCard({
  onClick,
  icon,
  iconClassName,
  containerClassName,
  title,
  titleClassName,
  description,
  badge,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full border rounded-xl p-3 flex items-center gap-3 transition-all active:scale-[0.98] ${containerClassName}`}
    >
      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${iconClassName}`}>
        <Icon icon={icon} className="size-5" />
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-bold ${titleClassName}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {badge}
      <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0" />
    </button>
  )
})

export default QuickActionCard
