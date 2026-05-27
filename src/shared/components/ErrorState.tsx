"use client";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { TriangleAlert } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message,
  onRetry,
  retryLabel = "Coba Lagi",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-destructive">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
