interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className}`}
      aria-hidden="true"
    />
  )
}

export const SkeletonCard = () => {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  )
}

export const SkeletonReservationCard = () => {
  return (
    <div className="snap-start shrink-0 w-52 bg-card rounded-2xl p-3 shadow-sm border border-border">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg mb-2" />
      <Skeleton className="h-6 w-full rounded-md" />
    </div>
  )
}

export const SkeletonJournalCard = () => {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="size-5" />
      </div>
      <Skeleton className="h-10 w-full mt-2" />
    </div>
  )
}

export const SkeletonList = ({ count = 3, type = 'card' }: { count?: number; type?: 'card' | 'reservation' | 'journal' }) => {
  const Component = type === 'reservation'
    ? SkeletonReservationCard
    : type === 'journal'
    ? SkeletonJournalCard
    : SkeletonCard

  return (
    <div className={type === 'reservation' ? 'flex gap-4' : 'space-y-3'}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  )
}

export default Skeleton
