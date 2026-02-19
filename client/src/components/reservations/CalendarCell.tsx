import { memo } from 'react'
import { Icon } from '../Icon'

interface CalendarCellProps {
  day: Date | null
  reservationCount: number
  isSelected: boolean
  isDragOver: boolean
  onSelect: (day: Date) => void
  onDragOver: (e: React.DragEvent, day: Date) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, day: Date) => void
  isToday: (day: Date) => boolean
}

function CalendarCellImpl({
  day,
  reservationCount,
  isSelected,
  isDragOver,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  isToday,
}: CalendarCellProps): JSX.Element {
  if (!day) {
    return <div className="aspect-square" />
  }

  const dayNumber = day.getDate()
  const month = day.getMonth() + 1
  const dayText = `${month}月${dayNumber}日`

  return (
    <div
      onDragOver={(e) => onDragOver(e, day)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, day)}
      className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-colors relative ${
        isDragOver
          ? 'bg-chart-2/20 border-2 border-chart-2 border-dashed'
          : isToday(day) && !isSelected
          ? 'bg-primary/10 border-2 border-primary'
          : isSelected
          ? 'bg-primary text-primary-foreground'
          : reservationCount > 0
          ? 'bg-primary/5 border border-primary/20'
          : 'hover:bg-muted'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect(day)
        }}
        className="w-full h-full flex flex-col items-center justify-start min-h-[48px] active:scale-[0.98] transition-all"
        aria-label={`${dayText}の予約を表示`}
      >
        <span className={`text-xs ${isSelected || isToday(day) ? 'font-bold' : ''}`}>
          {dayNumber}
        </span>
        {reservationCount > 0 && (
          <div className="flex items-center justify-center mt-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isSelected
                ? 'bg-white/30 text-white'
                : 'bg-primary text-primary-foreground'
            }`}>
              {reservationCount}件
            </span>
          </div>
        )}
      </button>
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-chart-2/30 rounded-lg">
          <Icon icon="solar:arrow-down-bold" className="size-6 text-chart-2" />
        </div>
      )}
    </div>
  )
}

const CalendarCell = memo(CalendarCellImpl)

export default CalendarCell
