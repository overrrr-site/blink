import { Icon } from './Icon'

interface LoadingSpinnerProps {
  message?: string
}

function LoadingSpinner({ message = '読み込み中...' }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Icon icon="solar:spinner-bold" width="24" height="24" className="text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default LoadingSpinner
