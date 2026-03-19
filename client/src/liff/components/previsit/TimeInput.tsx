export function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | undefined
  onChange: (v: string) => void
}) {
  const [hour, minute] = (value || '').split(':')
  const handleChange = (h: string, m: string) => {
    if (h || m) onChange(`${h || ''}:${m || ''}`)
    else onChange('')
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <input
        type="number"
        min={0} max={23}
        value={hour ?? ''}
        onChange={(e) => handleChange(e.target.value, minute ?? '')}
        placeholder="--"
        className="w-16 px-2 py-2 rounded-lg border border-border bg-input text-center text-sm min-h-[40px]"
      />
      <span className="text-sm">時</span>
      <input
        type="number"
        min={0} max={59}
        value={minute ?? ''}
        onChange={(e) => handleChange(hour ?? '', e.target.value)}
        placeholder="--"
        className="w-16 px-2 py-2 rounded-lg border border-border bg-input text-center text-sm min-h-[40px]"
      />
      <span className="text-sm">分頃</span>
    </div>
  )
}
