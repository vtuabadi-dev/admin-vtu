"use client";

import { useEffect, useCallback } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { X } from "lucide-react";

const modalSizeVariants = cva("", {
  variants: {
    size: {
      sm: "max-w-sm",
      default: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface ModalProps extends VariantProps<typeof modalSizeVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg" | "xl";
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "default",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-50 w-full rounded-lg border bg-background p-6 shadow-lg",
          modalSizeVariants({ size }),
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
