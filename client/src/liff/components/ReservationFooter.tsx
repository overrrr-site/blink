import { Icon } from '../../components/Icon'
type ReservationFooterProps = {
  isSaving: boolean
  isDisabled: boolean
  onSubmit: () => void
}

export default function ReservationFooter({ isSaving, isDisabled, onSubmit }: ReservationFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 pt-4 pb-6 z-50 safe-area-pb">
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSaving || isDisabled}
        className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-sm font-bold 
                   hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] transition-all 
                   flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed 
                   min-h-[56px] shadow-lg"
        aria-busy={isSaving}
      >
        {isSaving ? (
          <>
            <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
            送信中...
          </>
        ) : (
          <>
            <Icon icon="solar:check-circle-bold" width="20" height="20" />
            予約を確定する
          </>
        )}
      </button>
      <p className="text-center text-xs text-muted-foreground mt-2">
        予約確定後、店舗から確認のご連絡をいたします
      </p>
    </div>
  )
}
