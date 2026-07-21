"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/shared/hooks/use-session";
import { Button } from "@/shared/components/ui/Button";
import { ShieldAlert } from "lucide-react";

interface SessionGuardProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "jamaah" | "any";
}

export function SessionGuard({ children, requiredRole = "any" }: SessionGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, sessionExpired, isAdmin, isJamaah, logout } = useSession();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage — takes one tick
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (requiredRole === "admin" && !isAdmin) {
      router.push("/jamaah/dashboard");
      return;
    }

    if (requiredRole === "jamaah" && !isJamaah) {
      router.push("/admin/dashboard");
      return;
    }
  }, [hydrated, isLoading, isAuthenticated, isAdmin, isJamaah, requiredRole, router]);

  // Periodic session expiration check (every 15 seconds)
  const checkSessionExpired = useSession().checkSessionExpired;

  useEffect(() => {
    if (!isAuthenticated) return;

    checkSessionExpired();
    const interval = setInterval(() => {
      checkSessionExpired();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkSessionExpired]);

  // Handle session expired
  useEffect(() => {
    if (!sessionExpired) return;
    const timer = setTimeout(() => {
      logout();
      router.push("/login");
    }, 0);
    return () => clearTimeout(timer);
  }, [sessionExpired, logout, router]);

  // Not hydrated yet — show nothing
  if (!hydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — don't render children (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  // Session expired modal
  if (sessionExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl border bg-card shadow-lg max-w-sm text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sesi Habis</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sesi Anda telah berakhir (jam kerja selesai pukul 17:00 / tidak ada aktivitas selama 3 jam di luar jam kerja). Silakan login kembali.
            </p>
          </div>
          <Button
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Login Ulang
          </Button>
        </div>
      </div>
    );
  }

  // Role mismatch
  if (requiredRole === "admin" && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Mengalihkan ke portal jamaah...</p>
        </div>
      </div>
    );
  }

  if (requiredRole === "jamaah" && !isJamaah) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Mengalihkan ke dashboard admin...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
