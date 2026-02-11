import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element | null {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Focus the confirm button when dialog opens
    confirmButtonRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onCancel()
      }
      // Simple focus trap: Tab cycles between the two buttons
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmButtonClass =
    variant === 'destructive'
      ? 'bg-destructive text-white hover:bg-destructive/90'
      : 'bg-primary text-primary-foreground hover:bg-primary/90'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby="confirm-dialog-message"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-card rounded-2xl border border-border shadow-xl z-[60] max-w-sm mx-auto"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'
              }`}
            >
              <Icon
                icon={
                  variant === 'destructive'
                    ? 'solar:danger-triangle-bold'
                    : 'solar:question-circle-bold'
                }
                className={`size-5 ${
                  variant === 'destructive' ? 'text-destructive' : 'text-primary'
                }`}
              />
            </div>
            <h2 className="text-base font-bold">{title}</h2>
          </div>

          <p id="confirm-dialog-message" className="text-sm text-muted-foreground mb-6 ml-[52px]">
            {message}
          </p>

          <div className="flex gap-3 ml-[52px]">
            <button
              onClick={onCancel}
              className="flex-1 min-h-[48px] rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`flex-1 min-h-[48px] rounded-xl text-sm font-bold active:scale-[0.98] transition-all ${confirmButtonClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfirmDialog
