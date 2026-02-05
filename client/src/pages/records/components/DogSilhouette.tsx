interface DogSilhouetteProps {
  selectedParts: string[]
  onTogglePart: (part: string) => void
}

const GROOMING_COLOR = '#8B5CF6'

// 画像に合わせてボタン位置を調整
// 左側の犬（背中側）をベースに配置
const BODY_PARTS = [
  { id: 'head', label: '頭', x: '25%', y: '12%' },
  { id: 'face', label: '顔', x: '25%', y: '25%' },
  { id: 'ears', label: '耳', x: '12%', y: '18%' },
  { id: 'body', label: '体', x: '25%', y: '50%' },
  { id: 'tail', label: 'しっぽ', x: '25%', y: '88%' },
  { id: 'front_legs', label: '前足', x: '12%', y: '35%' },
  { id: 'back_legs', label: '後足', x: '12%', y: '70%' },
  { id: 'hip', label: 'お尻', x: '25%', y: '72%' },
  // 右側の犬（腹側）用のボタン
  { id: 'belly', label: 'お腹', x: '75%', y: '50%' },
  { id: 'paws', label: '肉球', x: '88%', y: '35%' },
] as const

export default function DogSilhouette({ selectedParts, onTogglePart }: DogSilhouetteProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        height: 220,
        background: '#FAF5FF',
        border: `2px solid ${GROOMING_COLOR}66`,
      }}
    >
      {/* Dog illustration */}
      <img
        src="/images/dog-silhouette.webp"
        alt="犬のイラスト"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[90%] w-auto opacity-40 pointer-events-none"
        style={{ maxWidth: '100%', objectFit: 'contain' }}
      />

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
              minWidth: 40,
              height: 28,
              padding: '0 10px',
              background: selected ? GROOMING_COLOR : '#FFFFFF',
              color: selected ? '#FFFFFF' : GROOMING_COLOR,
              border: `2px solid ${GROOMING_COLOR}`,
              boxShadow: selected ? `0 2px 8px ${GROOMING_COLOR}80` : '0 1px 3px rgba(0,0,0,0.1)',
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
