import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const BASE =
  'w-full rounded-[9px] border border-field bg-surface px-[14px] py-[12px] text-sm text-ink ' +
  'placeholder:text-[#a9a79d] outline-none transition-colors duration-150 ' +
  'focus:border-ink disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  recessed?: boolean;
}

export function Input({ recessed = false, className = '', ...props }: InputProps) {
  return (
    <input
      className={`${BASE} ${recessed ? 'bg-field-bg' : ''} ${className}`.trim()}
      {...props}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  recessed?: boolean;
}

export function Textarea({ recessed = false, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`${BASE} resize-none ${recessed ? 'bg-field-bg' : ''} ${className}`.trim()}
      {...props}
    />
  );
}
