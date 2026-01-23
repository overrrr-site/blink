type Step = 1 | 2 | 3

type StepIndicatorProps = {
  currentStep: Step
  canGoToStep2: boolean
  canGoToStep3: boolean
  onStepChange: (step: Step) => void
}

export default function StepIndicator({
  currentStep,
  canGoToStep2,
  canGoToStep3,
  onStepChange,
}: StepIndicatorProps) {
  return (
    <div className="px-5 pt-4 mb-4">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((step) => {
          const stepNumber = step as Step
          const isClickable =
            stepNumber === 1 ||
            (stepNumber === 2 && canGoToStep2) ||
            (stepNumber === 3 && canGoToStep3)
          const isDisabled = stepNumber > currentStep && !isClickable

          return (
            <div key={step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => {
                  if (isClickable || stepNumber <= currentStep) {
                    onStepChange(stepNumber)
                  }
                }}
                className={`flex-1 flex items-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  currentStep === stepNumber
                    ? 'bg-primary text-primary-foreground'
                    : stepNumber < currentStep
                    ? 'bg-chart-2/10 text-chart-2'
                    : 'bg-muted text-muted-foreground'
                }`}
                disabled={isDisabled}
              >
                <span
                  className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === stepNumber ? 'bg-primary-foreground/20' : 'bg-background'
                  }`}
                >
                  {step}
                </span>
                {stepNumber === 1 ? '日時' : stepNumber === 2 ? '犬選択' : '確認'}
              </button>
              {stepNumber < 3 && <div className="w-2 h-px bg-border mx-1" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
