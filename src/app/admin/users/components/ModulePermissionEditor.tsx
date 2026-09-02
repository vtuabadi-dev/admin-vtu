"use client";

import React from "react";
import { Shield, Sparkles, Eye, Trash2 } from "lucide-react";
import type { ModulePermission } from "@/app/api/admin/roles/route";

interface ModulePermissionEditorProps {
  permissions: ModulePermission[];
  onChange: (updatedPermissions: ModulePermission[]) => void;
}

export function ModulePermissionEditor({ permissions, onChange }: ModulePermissionEditorProps) {
  const handleToggle = (moduleKey: string, field: keyof Omit<ModulePermission, "moduleKey" | "moduleLabel">) => {
    const updated = permissions.map((p) => {
      if (p.moduleKey === moduleKey) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    });
    onChange(updated);
  };

  const handleApplyPreset = (preset: "full" | "readonly" | "none") => {
    const updated = permissions.map((p) => {
      if (preset === "full") {
        return {
          ...p,
          canView: true,
          canCreate: true,
          canEdit: true,
          canApprove: true,
          canExport: true,
          canDelete: true,
        };
      } else if (preset === "readonly") {
        return {
          ...p,
          canView: true,
          canCreate: false,
          canEdit: false,
          canApprove: false,
          canExport: false,
          canDelete: false,
        };
      } else {
        return {
          ...p,
          canView: false,
          canCreate: false,
          canEdit: false,
          canApprove: false,
          canExport: false,
          canDelete: false,
        };
      }
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Action Header & Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan Akses Modul Operasional *</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold">Preset Cepat:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset("full")}
            className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-500/30 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Full Access
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("readonly")}
            className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold border border-blue-500/30 transition-colors flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            Read Only
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("none")}
            className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10.5px] font-bold border border-rose-500/30 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Kosongkan
          </button>
        </div>
      </div>

      {/* Permissions Grid Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-[10.5px] font-bold text-muted-foreground uppercase border-b">
              <tr>
                <th className="py-2.5 px-3">Modul Sistem</th>
                <th className="py-2.5 px-1 text-center w-14">Lihat</th>
                <th className="py-2.5 px-1 text-center w-14">Tambah</th>
                <th className="py-2.5 px-1 text-center w-14">Edit</th>
                <th className="py-2.5 px-1 text-center w-14">Setujui</th>
                <th className="py-2.5 px-1 text-center w-14">Ekspor</th>
                <th className="py-2.5 px-1 text-center w-14">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[11.5px]">
              {permissions.map((p) => (
                <tr key={p.moduleKey} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 font-semibold text-foreground">
                    {p.moduleLabel}
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={p.canView}
                      onChange={() => handleToggle(p.moduleKey, "canView")}
                      className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={p.canCreate}
                      onChange={() => handleToggle(p.moduleKey, "canCreate")}
                      className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={p.canEdit}
                      onChange={() => handleToggle(p.moduleKey, "canEdit")}
                      className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={p.canApprove}
                      onChange={() => handleToggle(p.moduleKey, "canApprove")}
                      className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={p.canExport}
                      onChange={() => handleToggle(p.moduleKey, "canExport")}
                      className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={p.canDelete}
                      onChange={() => handleToggle(p.moduleKey, "canDelete")}
                      className="rounded border-slate-600 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
