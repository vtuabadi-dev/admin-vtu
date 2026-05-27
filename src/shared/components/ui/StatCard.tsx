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
    <div className={cn(statCardVariants({ variant }), className)}>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <p
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}
          >
            {trend.positive ? "+" : "-"}
            {trend.value}
          </p>
        )}
      </div>
      {Icon && (
        <div className="rounded-md bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
