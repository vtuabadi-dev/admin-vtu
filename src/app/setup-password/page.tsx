"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function SetupPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; role: string } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifyError("Tautan undangan tidak lengkap (token tidak ditemukan).");
        setVerifying(false);
        return;
      }

      try {
        setVerifying(true);
        setVerifyError(null);
        const res = await fetch(`/api/auth/setup-password?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message);
        }

        setUserInfo(json.data);
      } catch (err: any) {
        setVerifyError(err.message || "Tautan undangan tidak valid atau sudah tidak tersedia.");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || "Gagal menyimpan password baru.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-900/40 mb-1">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Atur Password Akun Pengelola
          </h1>
          <p className="text-xs text-slate-400">
            PT VAUZA TAMMA ABADI — Travel Operational System
          </p>
        </div>

        {/* Loading State */}
        {verifying && (
          <div className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
            <p className="text-xs text-slate-400">Memverifikasi tautan undangan Anda...</p>
          </div>
        )}

        {/* Verification Error State */}
        {!verifying && verifyError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300">Undangan Tidak Valid</p>
                <p className="mt-1 leading-relaxed text-red-200">{verifyError}</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 font-bold rounded-lg text-xs transition-colors border border-red-700/50"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        )}

        {/* Success State */}
        {!verifying && submitSuccess && (
          <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-300">Password Berhasil Dibuat!</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Akun pengelola Anda kini telah aktif. Anda akan diabaikan ke halaman login dalam 3 detik...
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md"
            >
              Masuk Sekarang
            </button>
          </div>
        )}

        {/* Setup Password Form */}
        {!verifying && !verifyError && !submitSuccess && userInfo && (
          <div className="space-y-5">
            {/* User Info Banner */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nama Lengkap:</span>
                <span className="font-bold text-white">{userInfo.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email Login:</span>
                <span className="font-mono text-emerald-400 font-semibold">{userInfo.email}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
                <span className="text-slate-400">Role Akses:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {userInfo.role}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password Baru *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password baru (min. 6 karakter)"
                    className="w-full h-10 px-3 pr-10 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Konfirmasi Password Baru *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru Anda"
                  className="w-full h-10 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Simpan &amp; Aktifkan Akun</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
