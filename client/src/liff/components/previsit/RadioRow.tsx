export function RadioRow<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string
  name: string
  value: T
  options: { value: T; label: string; danger?: boolean }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === opt.value
                ? opt.danger ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                : 'border-muted-foreground/30'
            }`}>
              {value === opt.value && <div className="size-2 rounded-full bg-white" />}
            </div>
            <span className={`text-sm ${opt.danger && value === opt.value ? 'text-destructive font-medium' : ''}`}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
