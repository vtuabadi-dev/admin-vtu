"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RegistrasiBaruPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/pembayaran/laporan");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm font-medium text-slate-600">
        Mengalihkan ke Manajemen Invoice & Pembayaran...
      </p>
    </div>
  );
}
