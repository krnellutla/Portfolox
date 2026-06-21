export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  value?: string;
  name?: string;
  disabled?: boolean;
}

export function Checkbox({ checked = false, onChange, label, value, name, disabled = false }: CheckboxProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        value={value}
        name={name}
        disabled={disabled}
      />
      <span
        className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
          checked ? 'border-ink bg-ink text-paper' : 'border-field bg-surface'
        }`}
      >
        {checked && <span className="text-[10px] font-bold leading-none">✓</span>}
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  );
}
