import { Icon } from './Icon'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  backPath?: string
  onBack?: () => void
  rightContent?: React.ReactNode
}

function PageHeader({ title, backPath, onBack, rightContent }: PageHeaderProps): JSX.Element {
  const navigate = useNavigate()

  function handleBack(): void {
    if (onBack) {
      onBack()
    } else if (backPath) {
      navigate(backPath)
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between safe-area-pt">
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          aria-label="戻る"
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted active:scale-95 transition-all"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <h1 className="text-lg font-bold font-heading">{title}</h1>
      </div>
      {rightContent}
    </header>
  )
}

export default PageHeader
