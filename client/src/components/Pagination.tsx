import { Icon } from './Icon'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="flex flex-col gap-3 items-center justify-between py-6 sm:flex-row">
      <div className="text-sm text-muted-foreground">
        {page} / {totalPages} ページ・全{total}件
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-border bg-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon icon="solar:alt-arrow-left-linear" width="16" height="16" />
          前へ
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-border bg-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
          <Icon icon="solar:alt-arrow-right-linear" width="16" height="16" />
        </button>
      </div>
    </div>
  )
}
