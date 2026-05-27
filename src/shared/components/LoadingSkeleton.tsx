"use client";

import { cn } from "@/shared/lib/utils";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

// ─── Variants ──────────────────────────────────────────────────────────

interface LoadingSkeletonProps {
  variant?: "card" | "table" | "list" | "page";
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = "card",
  rows = 4,
  className,
}: LoadingSkeletonProps) {
  switch (variant) {
    case "table":
      return <TableSkeleton rows={rows} className={className} />;
    case "list":
      return <ListSkeleton rows={rows} className={className} />;
    case "page":
      return <PageSkeleton className={className} />;
    case "card":
    default:
      return <CardSkeleton rows={rows} className={className} />;
  }
}

// ── Table skeleton ─────────────────────────────────────────────────────

function TableSkeleton({
  rows,
  className,
}: {
  rows: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <SkeletonBar className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ── List skeleton ──────────────────────────────────────────────────────

function ListSkeleton({
  rows,
  className,
}: {
  rows: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
          <SkeletonBar className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-4 w-3/4" />
            <SkeletonBar className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Card skeleton ──────────────────────────────────────────────────────

function CardSkeleton({
  rows,
  className,
}: {
  rows: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border p-6 space-y-3">
          <SkeletonBar className="h-4 w-1/3" />
          <SkeletonBar className="h-8 w-2/3" />
          <SkeletonBar className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

// ── Page skeleton ──────────────────────────────────────────────────────

function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-64" />
        <SkeletonBar className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <SkeletonBar className="h-72 rounded-xl" />
    </div>
  );
}
