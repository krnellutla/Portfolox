export interface RadioProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  value?: string;
  name?: string;
  disabled?: boolean;
}

export function Radio({ checked = false, onChange, label, value, name, disabled = false }: RadioProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input
        type="radio"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        value={value}
        name={name}
        disabled={disabled}
      />
      <span
        className={`inline-flex h-5 w-5 shrink-0 rounded-full border transition-colors duration-150 ${
          checked ? 'border-ink bg-ink shadow-[inset_0_0_0_3px_#fff]' : 'border-field bg-surface'
        }`}
      />
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  );
}
