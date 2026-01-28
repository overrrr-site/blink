import { Icon } from './Icon'
interface SaveButtonProps {
  saving: boolean
  label?: string
  savingLabel?: string
  onClick?: () => void
  disabled?: boolean
}

function SaveButton({
  saving,
  label = '保存する',
  savingLabel = '保存中...',
  onClick,
  disabled = false,
}: SaveButtonProps): JSX.Element {
  return (
    <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4 z-40">
      <button
        onClick={onClick}
        disabled={saving || disabled}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? (
          savingLabel
        ) : (
          <>
            <Icon icon="solar:check-circle-bold" width="20" height="20" />
            {label}
          </>
        )}
      </button>
    </div>
  )
}

export default SaveButton
