import type { ReactNode } from 'react'

interface RequiredSectionProps {
  title: string
  children: ReactNode
}

export default function RequiredSection({ title, children }: RequiredSectionProps) {
  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          必須
        </span>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
        {children}
      </div>
    </div>
  )
}
