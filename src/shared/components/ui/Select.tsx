"use client";

import { cn } from "@/shared/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  label?: string;
}

export function Select({
  options,
  placeholder,
  error,
  label,
  id,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
