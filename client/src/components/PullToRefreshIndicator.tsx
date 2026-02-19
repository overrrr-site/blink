import { Icon } from './Icon'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold?: number
}

export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 60,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null

  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = progress * 360

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: `${pullDistance}px` }}
    >
      <div
        className={`size-8 rounded-full bg-background shadow-md border border-border flex items-center justify-center ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={!isRefreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
      >
        <Icon
          icon={isRefreshing ? 'solar:refresh-bold' : 'solar:refresh-bold'}
          width="18"
          height="18"
          className="text-primary"
        />
      </div>
    </div>
  )
}
