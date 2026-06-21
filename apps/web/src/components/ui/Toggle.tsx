export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, id, disabled = false }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-[999px] transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-40
        ${checked ? 'bg-ink' : 'bg-field'}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-150 ${
          checked ? 'translate-x-[20px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}
