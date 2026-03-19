import { useNavigate } from 'react-router-dom'

interface GuideStep {
  step_number: number
  step_key: string
  title: string
  description: string
  action_url: string
  unlocked: boolean
  completed: boolean
  completed_at: string | null
}

interface TrialStepCardProps {
  step: GuideStep
}

export function TrialStepCard({ step }: TrialStepCardProps) {
  const navigate = useNavigate()

  // Completed state
  if (step.completed) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-60">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm text-muted-foreground line-through">{step.title}</span>
      </div>
    )
  }

  // Locked state
  if (!step.unlocked) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-40">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <span className="text-sm text-muted-foreground">{step.title}</span>
      </div>
    )
  }

  // Active (current) state
  return (
    <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">{step.step_number}</span>
        </div>
        <span className="text-sm font-bold text-foreground">{step.title}</span>
      </div>
      <p className="text-xs text-muted-foreground pl-9">{step.description}</p>
      <button
        onClick={() => navigate(step.action_url)}
        className="ml-9 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[36px]"
      >
        {step.title.replace(/しよう$|してみよう$/, 'する')} →
      </button>
    </div>
  )
}
