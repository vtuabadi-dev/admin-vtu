"use client";

import { useState, useEffect } from "react";
import TransitionLink from "@/shared/components/TransitionLink";
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
  Zap,
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

  const handleInstantAdminLogin = async (targetEmail = "admin@vtu.id", targetPass = "admin123") => {
    if (isSubmitting) return;
    setEmail(targetEmail);
    setPassword(targetPass);
    clearError();
    setIsSubmitting(true);
    try {
      await login(targetEmail, targetPass);
    } catch {
      // Login errors handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="w-full max-w-6xl px-4 sm:px-6">
      {/* ── Main 2-Column Metallic Green & Sage Card Container ── */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/10 grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
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
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 z-20 pointer-events-none text-emerald-800 stroke-[2] transition-all duration-200 group-focus-within:text-emerald-950 group-focus-within:opacity-100 group-focus-within:stroke-[2.5] group-focus-within:scale-110 group-hover:text-emerald-950" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="h-11 w-full bg-emerald-50/50 border border-emerald-200/80 rounded-xl pl-10 pr-3 text-sm font-bold text-emerald-950 placeholder:text-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-emerald-900">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 z-20 pointer-events-none text-emerald-800 stroke-[2] transition-all duration-200 group-focus-within:text-emerald-950 group-focus-within:opacity-100 group-focus-within:stroke-[2.5] group-focus-within:scale-110 group-hover:text-emerald-950" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  className="h-11 w-full bg-emerald-50/50 border border-emerald-200/80 rounded-xl pl-10 pr-10 text-sm font-bold text-emerald-950 placeholder:text-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-50 transition-all duration-200"
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

          {/* ── Instant Login Admin Section ── */}
          <div className="mt-6 pt-5 border-t border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500 animate-bounce" /> Akses Cepat (Admin Only)
              </span>
              <span className="text-[10px] text-emerald-700/70 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                1-Click Instant Login
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleInstantAdminLogin("admin@vtu.id", "admin123")}
              disabled={isSubmitting}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-xs bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 shadow-md shadow-amber-500/20 transition-all duration-200 border border-amber-400 disabled:opacity-50"
            >
              ⚡ LOGIN INSTAN SUPER ADMIN (LEGACY)
            </button>
          </div>
        </div>

        {/* ── Right Side: Poster Theme Emerald & Gold Panel (Col 6-12 on LG) ── */}
        <div className="lg:col-span-7 relative bg-gradient-to-br from-[#041710] via-[#082C21] to-[#0E4334] text-white p-8 sm:p-10 flex flex-col justify-center rounded-t-3xl lg:rounded-t-none lg:rounded-l-[120px] border-l border-[#D4AF37]/30 overflow-hidden">
          
          {/* Subtle Gold & Emerald Ambient Light Reflections */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Panel Header */}
          <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 backdrop-blur-md text-[11px] font-bold text-[#F5D061] border border-[#D4AF37]/40 mb-2">
              <Compass className="h-3.5 w-3.5 text-[#F5D061]" />
              <span>✦ Portal Layanan Operasional VTU ✦</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Layanan Jamaah & <span className="text-gold-gradient">Publik</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1.5 max-w-lg mx-auto">
              Akses cepat pendaftaran jamaah, badal umroh, wakaf Al-Qur&apos;an, serta pelacakan status secara langsung.
            </p>
          </div>

          {/* 4 Service Boxes Container */}
          <div className="relative z-10 space-y-3.5 max-w-xl mx-auto w-full">
            
            {/* Box 1: Portal Registrasi Jamaah Umroh */}
            <TransitionLink
              href="/register"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-white/15 hover:shadow-lg hover:shadow-[#D4AF37]/10 transition-all duration-300 transform hover:-translate-y-0.5 group cursor-pointer block"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] group-hover:scale-105 transition-transform">
                  <UserPlus className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-100 transition-colors">
                  Portal Registrasi Jamaah Umroh
                </span>
              </div>
              <span
                className="bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] group-hover:brightness-110 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                DAFTAR
              </span>
            </TransitionLink>

            {/* Box 2: Pendaftaran Badal Umroh */}
            <TransitionLink
              href="/register/badal-umroh"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#082C21]/80 backdrop-blur-md border border-[#D4AF37]/40 hover:border-[#F5D061] hover:bg-[#0A2E23] hover:shadow-lg hover:shadow-[#F5D061]/15 transition-all duration-300 transform hover:-translate-y-0.5 group cursor-pointer block"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/25 border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] group-hover:scale-105 transition-transform">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#FAF6EE] group-hover:text-[#F5D061] transition-colors">
                  Pendaftaran Badal Umroh
                </span>
              </div>
              <span
                className="bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] group-hover:brightness-110 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                BADAL
              </span>
            </TransitionLink>

            {/* Box 3: Pendaftaran Wakaf Al-Qur'an */}
            <TransitionLink
              href="/register/wakaf-quran"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-white/15 hover:shadow-lg hover:shadow-[#D4AF37]/10 transition-all duration-300 transform hover:-translate-y-0.5 group cursor-pointer block"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] group-hover:scale-105 transition-transform">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                  Pendaftaran Wakaf Al-Qur&apos;an
                </span>
              </div>
              <span
                className="bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B8860B] group-hover:brightness-110 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                WAKAF
              </span>
            </TransitionLink>

            {/* Box 4: Cek Status Badal & Wakaf (OTP WA) */}
            <TransitionLink
              href="/track/badal-wakaf"
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#041710]/90 backdrop-blur-md border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#061F16] hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 transform hover:-translate-y-0.5 group cursor-pointer block"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-amber-50 group-hover:text-amber-200 transition-colors">
                  Cek Status Badal & Wakaf (OTP WA)
                </span>
              </div>
              <span
                className="bg-amber-600 group-hover:bg-amber-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                CEK STATUS
              </span>
            </TransitionLink>

          </div>

        </div>

      </div>
    </div>
  );
}
