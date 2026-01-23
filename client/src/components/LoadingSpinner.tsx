interface LoadingSpinnerProps {
  message?: string
}

function LoadingSpinner({ message = '読み込み中...' }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

export default LoadingSpinner
