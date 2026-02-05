interface DogSilhouetteProps {
  selectedParts: string[]
  onTogglePart: (part: string) => void
}

const GROOMING_COLOR = '#8B5CF6'

const BODY_PARTS = [
  { id: 'head', label: '頭', x: '50%', y: '12%' },
  { id: 'face', label: '顔', x: '50%', y: '28%' },
  { id: 'ears', label: '耳', x: '28%', y: '10%' },
  { id: 'body', label: '体', x: '50%', y: '50%' },
  { id: 'tail', label: 'しっぽ', x: '85%', y: '38%' },
  { id: 'front_legs', label: '前足', x: '35%', y: '78%' },
  { id: 'back_legs', label: '後足', x: '68%', y: '78%' },
  { id: 'hip', label: 'お尻', x: '75%', y: '55%' },
] as const

export default function DogSilhouette({ selectedParts, onTogglePart }: DogSilhouetteProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        height: 180,
        background: '#FAF5FF',
        border: `2px solid ${GROOMING_COLOR}66`,
      }}
    >
      {/* SVG Silhouette */}
      <svg
        viewBox="0 0 100 100"
        className="absolute top-1/2 left-1/2"
        style={{
          width: '70%',
          height: '70%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.2,
          color: GROOMING_COLOR,
        }}
      >
        {/* Body */}
        <ellipse cx="50" cy="50" rx="25" ry="18" fill="currentColor" />
        {/* Head */}
        <circle cx="50" cy="25" r="15" fill="currentColor" />
        {/* Left ear */}
        <ellipse cx="38" cy="15" rx="6" ry="10" fill="currentColor" />
        {/* Right ear */}
        <ellipse cx="62" cy="15" rx="6" ry="10" fill="currentColor" />
        {/* Tail */}
        <path d="M75 45 Q90 30 85 50" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Front left leg */}
        <rect x="32" y="65" width="6" height="20" rx="3" fill="currentColor" />
        {/* Front right leg */}
        <rect x="42" y="65" width="6" height="20" rx="3" fill="currentColor" />
        {/* Back left leg */}
        <rect x="55" y="65" width="6" height="20" rx="3" fill="currentColor" />
        {/* Back right leg */}
        <rect x="65" y="65" width="6" height="20" rx="3" fill="currentColor" />
      </svg>

      {/* Interactive body part buttons */}
      {BODY_PARTS.map(({ id, label, x, y }) => {
        const selected = selectedParts.includes(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTogglePart(id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-bold transition-all duration-150"
            style={{
              left: x,
              top: y,
              minWidth: 36,
              height: 30,
              padding: '0 10px',
              background: selected ? GROOMING_COLOR : '#FFFFFF',
              color: selected ? '#FFFFFF' : GROOMING_COLOR,
              border: `2px solid ${GROOMING_COLOR}`,
              boxShadow: selected ? `0 2px 8px ${GROOMING_COLOR}80` : 'none',
            }}
            aria-pressed={selected}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
