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
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg" | "xl";
}

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = "default",
}: ModalProps) {
  const isShown = open ?? isOpen ?? false;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isShown) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isShown, handleKeyDown]);

  if (!isShown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-50 w-full max-h-[90vh] flex flex-col rounded-xl border bg-background p-5 sm:p-6 shadow-2xl my-auto",
          modalSizeVariants({ size }),
          className
        )}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
