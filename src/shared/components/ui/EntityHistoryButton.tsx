"use client";

import { useState } from "react";
import { History, ShieldAlert, Activity, FileClock, Camera } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { cn } from "@/shared/lib/utils";

interface EntityHistoryButtonProps {
  entityId: string;
  entityType: string;
}

type HistoryTab = "AUDIT_TRAIL" | "ACTIVITY_TIMELINE" | "REVISION_HISTORY" | "SNAPSHOTS";

export function EntityHistoryButton({ entityId, entityType }: EntityHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>("AUDIT_TRAIL");

  const tabs = [
    { id: "AUDIT_TRAIL", label: "Audit Trail", icon: ShieldAlert },
    { id: "ACTIVITY_TIMELINE", label: "Activity Timeline", icon: Activity },
    { id: "REVISION_HISTORY", label: "Revision History", icon: FileClock },
    { id: "SNAPSHOTS", label: "Snapshots", icon: Camera },
  ] as const;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground gap-2"
      >
        <History className="h-4 w-4" />
        <span className="hidden sm:inline">History</span>
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Entity History: ${entityType}`}
        size="xl"
      >
        <div className="flex flex-col md:flex-row gap-4 h-[60vh] mt-4">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 flex flex-col gap-1 border-r pr-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as HistoryTab)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-muted/10 rounded-md p-4">
            <div className="rounded-md bg-muted p-4 flex items-start gap-3 text-sm mb-4">
              <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-foreground">Enterprise Activity Center Integration</p>
                <p className="text-muted-foreground mt-1">
                  Data history untuk ID <strong>{entityId}</strong> akan di-fetch secara real-time dari arsitektur Append-Only Log.
                </p>
              </div>
            </div>
            
            <div className="border rounded-md p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
              <History className="h-10 w-10 mb-4 opacity-20" />
              <p>Tampilan untuk <strong>{tabs.find(t => t.id === activeTab)?.label}</strong></p>
              <p className="text-xs mt-2 max-w-sm">
                Akan diimplementasikan pada fase Enterprise Command Center (Sprint 13). Seluruh data event yang di-emit melalui Activity Logger akan dirender di sini.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Tutup
          </Button>
        </div>
      </Modal>
    </>
  );
}
