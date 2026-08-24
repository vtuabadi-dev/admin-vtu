import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import type { LucideIcon } from "lucide-react";

const statCardVariants = cva("operational-card border-l-4 flex items-start justify-between", {
  variants: {
    variant: {
      default: "",
      warning: "border-l-warning",
      danger: "border-l-destructive",
      success: "border-l-success",
      info: "border-l-info",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div className={cn(statCardVariants({ variant }), "border border-slate-200 bg-white rounded-xl p-4 shadow-sm hover:border-emerald-500/50 transition-all flex items-start justify-between", className)}>
      <div className="space-y-1">
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-black tracking-tight text-slate-900">{value}</p>
        {trend && (
          <p
            className={cn(
              "text-xs font-semibold flex items-center gap-1",
              trend.positive ? "text-emerald-700" : "text-destructive"
            )}
          >
            {trend.positive ? "▲ " : "▼ "}
            {trend.value}
          </p>
        )}
      </div>
      {Icon && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 shadow-sm shrink-0">
          <Icon className="h-4 w-4 text-emerald-700" />
        </div>
      )}
    </div>
  );
}
