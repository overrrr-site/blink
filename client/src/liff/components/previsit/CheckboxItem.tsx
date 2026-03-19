import { Icon } from '../../../components/Icon'

export function CheckboxItem({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[56px]
                  active:scale-[0.99] ${
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
    >
      <div className={`size-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
        checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
      }`}>
        {checked && (
          <Icon icon="solar:check-linear" width="16" height="16" className="text-white" />
        )}
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
