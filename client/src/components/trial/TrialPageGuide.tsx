import { useState } from 'react'
import { useTrialStore } from '../../store/trialStore'
import { CharacterBubble } from './GuideCharacter'
import type { CharacterExpression } from './GuideCharacter'

interface TrialPageGuideProps {
  stepKey: string
  title: string
  detail: string
  expression?: CharacterExpression
}

export function TrialPageGuide({ stepKey, title, detail, expression = 'pointing' }: TrialPageGuideProps) {
  const { isTrial, guideCompleted, currentStep } = useTrialStore()
  const [dismissed, setDismissed] = useState(false)

  const isActive = isTrial && !guideCompleted && currentStep?.step_key === stepKey

  if (!isActive || dismissed) return null

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative">
        <CharacterBubble expression={expression} size="sm" title={title}>
          {detail}
        </CharacterBubble>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="閉じる"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
