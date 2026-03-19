export function BooleanRow({
  label,
  name,
  value,
  detail,
  onValueChange,
  onDetailChange,
  detailPlaceholder,
}: {
  label: string
  name: string
  value: boolean
  detail?: string
  onValueChange: (v: boolean) => void
  onDetailChange: (v: string) => void
  detailPlaceholder?: string
}) {
  return (
    <div className="py-3 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-20 shrink-0">{label}</span>
        <div className="flex gap-2">
          {[false, true].map((opt) => (
            <label key={String(opt)} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={name} checked={value === opt} onChange={() => onValueChange(opt)} className="sr-only" />
              <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                value === opt
                  ? opt ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                  : 'border-muted-foreground/30'
              }`}>
                {value === opt && <div className="size-2 rounded-full bg-white" />}
              </div>
              <span className={`text-sm ${opt && value === opt ? 'text-destructive font-medium' : ''}`}>{opt ? 'あり' : 'なし'}</span>
            </label>
          ))}
        </div>
      </div>
      {value && (
        <input
          type="text"
          value={detail ?? ''}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder ?? '詳細を入力'}
          className="mt-2 ml-[calc(5rem+0.75rem)] w-[calc(100%-5rem-0.75rem)] px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[40px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      )}
    </div>
  )
}
