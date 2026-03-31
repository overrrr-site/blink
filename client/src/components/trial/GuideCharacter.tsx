import blinkDefault from '../../assets/guide/blink-default.png'
import blinkCelebrate from '../../assets/guide/blink-celebrate.png'
import blinkPointing from '../../assets/guide/blink-pointing.png'
import blinkWaving from '../../assets/guide/blink-waving.png'
import blinkThinking from '../../assets/guide/blink-thinking.png'

export type CharacterExpression = 'default' | 'celebrate' | 'pointing' | 'waving' | 'thinking'

const EXPRESSION_MAP: Record<CharacterExpression, string> = {
  default: blinkDefault,
  celebrate: blinkCelebrate,
  pointing: blinkPointing,
  waving: blinkWaving,
  thinking: blinkThinking,
}

const SIZE_MAP = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
} as const

interface GuideCharacterProps {
  expression?: CharacterExpression
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function GuideCharacter({ expression = 'default', size = 'md', className = '' }: GuideCharacterProps) {
  return (
    <img
      src={EXPRESSION_MAP[expression]}
      alt=""
      className={`${SIZE_MAP[size]} object-contain flex-shrink-0 ${className}`}
      draggable={false}
    />
  )
}

interface CharacterBubbleProps {
  expression?: CharacterExpression
  size?: keyof typeof SIZE_MAP
  title?: string
  children: React.ReactNode
  className?: string
}

export function CharacterBubble({ expression = 'pointing', size = 'md', title, children, className = '' }: CharacterBubbleProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <GuideCharacter expression={expression} size={size} />
      <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl px-3.5 py-2.5 relative">
        <div className="absolute -left-2 top-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary/20" />
        {title && <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>}
        <div className="text-[13px] text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
