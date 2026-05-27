"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  // Session hook provides auth primitives
  const { login, loginError, clearError, isAuthenticated, role } =
    useSession();

  // Direct store access for remember-me and user (not exposed via useSession)
  const rememberMe = useAuthStore((s) => s.rememberMe);
  const setRememberMe = useAuthStore((s) => s.setRememberMe);
  const storeLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<"admin" | "jamaah">("admin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Redirect on successful login based on role
  useEffect(() => {
    if (!isAuthenticated) return;

    if (role === "jamaah") {
      router.push("/jamaah/dashboard");
    } else {
      // Admin role (super_admin, admin_operasional, admin_pembayaran, etc.)
      router.push("/admin/dashboard");
    }
  }, [isAuthenticated, role, router]);

  // Reset form and clear error when switching tabs
  const handleTabSwitch = useCallback(
    (type: "admin" | "jamaah") => {
      if (type === loginType) return;
      clearError();
      setLoginType(type);
      setEmail("");
      setPassword("");
    },
    [loginType, clearError]
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    clearError();
    setIsSubmitting(true);

    try {
      await login(email, password, loginType);
    } catch {
      // Login errors are set on the store; nothing to handle here
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show a full-page loading spinner while the auth store rehydrates
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

  const isAdmin = loginType === "admin";

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

        {/* ── Tab Selector ── */}
        <div className="flex border-b border-border mb-6">
          <button
            type="button"
            onClick={() => handleTabSwitch("admin")}
            className={cn(
              "flex-1 pb-3 text-sm font-medium transition-colors duration-200 relative",
              isAdmin
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Admin
            {isAdmin && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("jamaah")}
            className={cn(
              "flex-1 pb-3 text-sm font-medium transition-colors duration-200 relative",
              !isAdmin
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Jamaah
            {!isAdmin && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* ── Login Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email / Telepon */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              {isAdmin ? "Email" : "Email / No. Telepon"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAdmin ? "admin@vtu.id" : "jamaah@email.com"}
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

          {/* Remember me + Forgot password */}
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
                alert("Fitur lupa password akan tersedia di production.")
              }
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Lupa Password?
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

        {/* ── Demo Credentials ── */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDemo((prev) => !prev)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 text-center"
          >
            Klik untuk melihat kredensial demo
          </button>
          {showDemo && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border space-y-3 transition-all duration-200">
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-foreground">Admin:</p>
                <p className="text-muted-foreground">
                  Email: admin@vtu.id
                </p>
                <p className="text-muted-foreground">
                  Password: admin123
                </p>
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-foreground">Jamaah:</p>
                <p className="text-muted-foreground">
                  Email: jamaah@email.com
                </p>
                <p className="text-muted-foreground">
                  Password: jamaah123
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
