"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSession } from "@/shared/hooks/use-session";
import { cn } from "@/shared/lib/utils";
import {
  Eye,
  EyeOff,
  LogIn,
  Shield,
  Mail,
  Lock,
  Loader2,
  X,
} from "lucide-react";

export default function LoginPage() {
  const { login, loginError, clearError, isAuthenticated, role } = useSession();

  const rememberMe = useAuthStore((s) => s.rememberMe);
  const setRememberMe = useAuthStore((s) => s.setRememberMe);
  const storeLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hard redirect on successful login based on role to avoid router stale cache
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    if (role === "jamaah") {
      window.location.href = "/jamaah/dashboard";
    } else {
      window.location.href = "/admin/dashboard";
    }
  }, [isAuthenticated, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearError();
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch {
      // Login errors are handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card shadow-sm border rounded-xl p-8">
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            VTU Operasional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistem Manajemen Perjalanan Umroh
          </p>
        </div>

        {/* ── Login Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="h-11 w-full bg-background border border-input rounded-lg pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                className="h-11 w-full bg-background border border-input rounded-lg pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
              />
              <span className="text-sm text-muted-foreground">
                Ingat Saya
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                alert("Silakan hubungi Super Admin jika Anda mengalami kendala login.")
              }
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Bantuan Login
            </button>
          </div>

          {/* Error message */}
          {loginError && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg border border-destructive/20",
                "bg-destructive/10 p-3"
              )}
              role="alert"
            >
              <p className="text-sm text-destructive flex-1">{loginError}</p>
              <button
                type="button"
                onClick={clearError}
                className="text-destructive/70 hover:text-destructive transition-colors duration-200 shrink-0"
                aria-label="Tutup pesan error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full h-11 inline-flex items-center justify-center rounded-lg",
              "bg-primary text-primary-foreground text-sm font-medium shadow",
              "hover:bg-primary/90 transition-colors duration-200",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memeriksa...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Masuk
              </>
            )}
          </button>
        </form>

        {/* ── Portal Registrasi Jamaah ── */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="text-center space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Belum menjadi jamaah?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Silakan lakukan pendaftaran online melalui portal registrasi.
              </p>
            </div>
            <a
              href="/register"
              className="block w-full py-2.5 px-4 rounded-lg border-2 border-primary/20 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary/30 transition-colors duration-200 text-center"
            >
              Portal Registrasi Jamaah
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
