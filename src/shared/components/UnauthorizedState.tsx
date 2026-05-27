"use client";

import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface UnauthorizedStateProps {
  role?: string;
  dashboardLink?: string;
}

export function UnauthorizedState({
  role = "jamaah",
  dashboardLink,
}: UnauthorizedStateProps) {
  const router = useRouter();

  const href =
    dashboardLink ?? (role === "admin" ? "/admin/dashboard" : "/jamaah/dashboard");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-5 p-8 rounded-xl border bg-card shadow-lg max-w-sm text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldOff className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Akses Ditolak</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Anda tidak memiliki izin untuk mengakses halaman ini.
            {role && (
              <>
                {" "}
                Halaman ini hanya tersedia untuk pengguna dengan role{" "}
                <strong className="text-foreground">{role}</strong>.
              </>
            )}
          </p>
        </div>
        <Button
          onClick={() => router.push(href)}
        >
          Kembali ke Dashboard
        </Button>
      </div>
    </div>
  );
}
