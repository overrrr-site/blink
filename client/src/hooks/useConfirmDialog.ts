import { useState, useCallback, useRef } from 'react'

interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: 'default' | 'destructive'
}

interface UseConfirmDialogReturn {
  dialogState: ConfirmDialogState
  confirm: (options?: {
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive'
  }) => Promise<boolean>
  handleConfirm: () => void
  handleCancel: () => void
}

const DEFAULT_STATE: ConfirmDialogState = {
  isOpen: false,
  title: '確認',
  message: 'この操作を実行しますか？',
  confirmLabel: 'OK',
  cancelLabel: 'キャンセル',
  variant: 'default',
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(DEFAULT_STATE)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback(
    (options?: {
      title?: string
      message?: string
      confirmLabel?: string
      cancelLabel?: string
      variant?: 'default' | 'destructive'
    }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve
        setDialogState({
          isOpen: true,
          title: options?.title ?? DEFAULT_STATE.title,
          message: options?.message ?? DEFAULT_STATE.message,
          confirmLabel: options?.confirmLabel ?? DEFAULT_STATE.confirmLabel,
          cancelLabel: options?.cancelLabel ?? DEFAULT_STATE.cancelLabel,
          variant: options?.variant ?? DEFAULT_STATE.variant,
        })
      })
    },
    []
  )

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setDialogState(DEFAULT_STATE)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setDialogState(DEFAULT_STATE)
  }, [])

  return { dialogState, confirm, handleConfirm, handleCancel }
}
