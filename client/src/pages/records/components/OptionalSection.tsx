import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'

interface OptionalSectionProps {
  title: string
  collapsed: boolean
  onToggle: () => void
  summary?: string
  children: ReactNode
}

export default function OptionalSection({ title, collapsed, onToggle, summary, children }: OptionalSectionProps) {
  return (
    <div className="mx-4 mt-4">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl transition-all min-h-[44px] border ${
          collapsed ? 'bg-transparent border-muted' : 'bg-white border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
      >
        <span className="text-sm font-bold text-foreground">{title}</span>
        <span className="flex items-center gap-2 min-w-0">
          {collapsed && summary && (
            <span className="text-xs text-muted-foreground truncate max-w-[55vw] text-right">{summary}</span>
          )}
          <Icon
            icon={collapsed ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'}
            width="18"
            height="18"
            className="text-muted-foreground shrink-0"
          />
        </span>
      </button>
      {!collapsed && (
        <div className="bg-white rounded-b-2xl p-4 border border-t-0 border-border shadow-sm -mt-2 pt-6">
          {children}
        </div>
      )}
    </div>
  )
}
