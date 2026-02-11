const GROOMING_COLOR = '#8B5CF6'

interface WeightEntry {
  date: string
  weight: number
}

interface WeightGraphProps {
  /** Weight history (most recent last) */
  history: WeightEntry[]
  /** Current weight value */
  currentWeight?: number
}

export default function WeightGraph({ history, currentWeight }: WeightGraphProps) {
  if (history.length === 0 && !currentWeight) return null

  const weights = history.map((e) => e.weight)
  const displayWeight = currentWeight ?? (weights.length > 0 ? weights[weights.length - 1] : 0)

  // Calculate weight change
  let changeText = ''
  let changeStyle: 'increase' | 'decrease' | 'none' = 'none'
  if (weights.length >= 2) {
    const diff = weights[weights.length - 1] - weights[weights.length - 2]
    if (Math.abs(diff) >= 0.01) {
      changeText = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}kg`
      changeStyle = diff > 0 ? 'increase' : 'decrease'
    }
  }

  // Generate SVG points
  const points = generatePoints(weights)

  return (
    <div>
      {/* Weight display */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-[26px] font-bold" style={{ color: 'var(--foreground)' }}>
          {displayWeight.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">kg</span>
        {changeStyle !== 'none' && (
          <span
            className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: changeStyle === 'increase' ? '#FFFBEB' : '#ECFDF5',
              color: changeStyle === 'increase' ? '#F59E0B' : '#10B981',
            }}
          >
            {changeStyle === 'increase' ? '↑' : '↓'} {changeText}
          </span>
        )}
      </div>

      {/* Graph */}
      {weights.length >= 2 && (
        <div className="rounded-xl p-2" style={{ height: 56, background: 'hsl(var(--muted))' }}>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
            <polyline
              points={points}
              fill="none"
              stroke={GROOMING_COLOR}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {weights.map((_, i) => {
              const x = weights.length === 1 ? 50 : (i / (weights.length - 1)) * 100
              const y = normalizeY(weights[i], weights)
              const isLast = i === weights.length - 1
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isLast ? 4 : 3}
                  fill={isLast ? GROOMING_COLOR : '#FFFFFF'}
                  stroke={GROOMING_COLOR}
                  strokeWidth="2"
                />
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

function normalizeY(value: number, values: number[]): number {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  // SVG y-axis is inverted (top = 0)
  const padding = 5
  return padding + (1 - (value - min) / range) * (40 - padding * 2)
}

function generatePoints(weights: number[]): string {
  return weights
    .map((w, i) => {
      const x = weights.length === 1 ? 50 : (i / (weights.length - 1)) * 100
      const y = normalizeY(w, weights)
      return `${x},${y}`
    })
    .join(' ')
}
