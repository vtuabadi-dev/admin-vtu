import React, { forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  error?: string;
  label?: string;
}

export function formatNumberWithDots(val: number | string | null | undefined): string {
  if (val === undefined || val === null || val === "" || val === 0) return "";
  const num = typeof val === "string" ? parseInt(val.replace(/\D/g, ""), 10) : val;
  if (isNaN(num) || num === 0) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseDotsToNumber(formattedStr: string): number {
  if (!formattedStr) return 0;
  const digits = formattedStr.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = "Rp", error, label, id, placeholder = "0", disabled, ...props }, ref) => {
    const displayValue = formatNumberWithDots(value);

    return (
      <div className="space-y-1 w-full">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {prefix && (
            <span className="absolute left-3 font-extrabold text-xs text-amber-600 dark:text-amber-400 select-none pointer-events-none z-10">
              {prefix}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            id={id}
            disabled={disabled}
            autoComplete="off"
            value={displayValue}
            placeholder={placeholder}
            onChange={(e) => {
              const numericValue = parseDotsToNumber(e.target.value);
              onChange(numericValue);
            }}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono font-bold text-foreground",
              prefix ? "pl-9 pr-3" : "px-3",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
