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
  HeartHandshake,
  BookOpen,
  ShieldCheck,
  UserPlus,
  Compass,
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

  // Hard redirect on successful login based on role
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
      // Login errors handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
          <p className="text-sm font-medium text-emerald-800">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      {/* ── Main 2-Column Metallic Green & Sage Card Container ── */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/10 grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* ── Left Side: Login Form (Col 1-5 on LG) ── */}
        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-center bg-white">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white shadow-md shadow-emerald-900/20 mb-3">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-950">
              Sign In
            </h1>
            <p className="text-xs text-emerald-700/80 font-medium mt-1">
              VTU Operasional — Perjalanan Umroh
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-emerald-900">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="h-11 w-full bg-emerald-50/50 border border-emerald-200/80 rounded-xl pl-10 pr-3 text-sm text-emerald-950 placeholder:text-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-emerald-900">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  className="h-11 w-full bg-emerald-50/50 border border-emerald-200/80 rounded-xl pl-10 pr-10 text-sm text-emerald-950 placeholder:text-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-50 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600/70 hover:text-emerald-950 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox & Help */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-xs text-emerald-800 font-medium">Ingat Saya</span>
              </label>
              <button
                type="button"
                onClick={() => alert("Silakan hubungi Super Admin jika Anda mengalami kendala login.")}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-950 transition-colors"
              >
                Bantuan Login?
              </button>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <p className="flex-1 font-medium">{loginError}</p>
                <button type="button" onClick={clearError} aria-label="Tutup pesan error">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Submit Button (Metallic Green Gradient) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full h-11 inline-flex items-center justify-center rounded-xl font-bold text-sm tracking-wide text-white shadow-lg transition-all duration-200",
                "bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 hover:from-emerald-800 hover:to-teal-950 shadow-emerald-900/25 active:scale-[0.99]",
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
                  SIGN IN
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Right Side: Metallic Green Panel with Continuous Smooth Curved Left Edge (Col 6-12 on LG) ── */}
        <div className="lg:col-span-7 relative bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 text-white p-8 sm:p-10 flex flex-col justify-center rounded-t-3xl lg:rounded-t-none lg:rounded-l-[120px] border-l border-white/10 overflow-hidden">
          
          {/* Subtle Ambient Light Reflections */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Panel Header */}
          <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-emerald-200 border border-white/15 mb-2">
              <Compass className="h-3.5 w-3.5 text-emerald-300" />
              <span>Portal Layanan Operasional</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Layanan Jamaah & Publik
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1.5 max-w-md mx-auto">
              Akses cepat pendaftaran jamaah, badal umroh, wakaf Al-Qur&apos;an, serta pelacakan status secara langsung.
            </p>
          </div>

          {/* 4 Service Boxes Container (Matching Image 2 Layout) */}
          <div className="relative z-10 space-y-3 max-w-lg mx-auto w-full">
            
            {/* Box 1: Portal Registrasi Jamaah Umroh */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all shadow-md group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <UserPlus className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-100 transition-colors">
                  Portal Registrasi Jamaah Umroh
                </span>
              </div>
              <a
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                DAFTAR
              </a>
            </div>

            {/* Box 2: Pendaftaran Badal Umroh */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-emerald-950/40 backdrop-blur-md border border-emerald-400/30 hover:bg-emerald-900/40 transition-all shadow-md group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-emerald-50 group-hover:text-emerald-200 transition-colors">
                  Pendaftaran Badal Umroh
                </span>
              </div>
              <a
                href="/register/badal-umroh"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                BADAL
              </a>
            </div>

            {/* Box 3: Pendaftaran Wakaf Al-Qur'an */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all shadow-md group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-sky-100 transition-colors">
                  Pendaftaran Wakaf Al-Qur&apos;an
                </span>
              </div>
              <a
                href="/register/wakaf-quran"
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                WAKAF
              </a>
            </div>

            {/* Box 4: Cek Status Badal & Wakaf (OTP WA) */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-amber-950/40 backdrop-blur-md border border-amber-400/30 hover:bg-amber-900/40 transition-all shadow-md group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-amber-50 group-hover:text-amber-200 transition-colors">
                  Cek Status Badal & Wakaf (OTP WA)
                </span>
              </div>
              <a
                href="/track/badal-wakaf"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                CEK STATUS
              </a>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
