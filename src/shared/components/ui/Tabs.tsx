"use client";

import { cva } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { useState, useCallback } from "react";

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (value: string) => void;
  className?: string;
  children: (activeTab: string) => React.ReactNode;
}

const tabButtonVariants = cva(
  "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      active: {
        true: "border-primary text-primary",
        false: "border-transparent text-muted-foreground hover:text-foreground",
      },
    },
  }
);

const tabCountVariants = cva("rounded-full px-1.5 py-0.5 text-xs", {
  variants: {
    active: {
      true: "bg-primary/10 text-primary",
      false: "bg-muted text-muted-foreground",
    },
  },
});

export function Tabs({
  tabs,
  defaultTab,
  onTabChange,
  className,
  children,
}: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.value ?? "");

  const handleChange = useCallback(
    (value: string) => {
      setActive(value);
      onTabChange?.(value);
    },
    [onTabChange]
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex border-b">
        {tabs.map((tab) => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleChange(tab.value)}
              className={tabButtonVariants({ active: isActive })}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={tabCountVariants({ active: isActive })}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children(active)}
    </div>
  );
}
