"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookText,
  User,
  Phone,
  MessageSquare,
  CheckCircle2,
  Send,
  Loader2,
  Sparkles,
  MapPin,
  HeartHandshake,
} from "lucide-react";

const OPSI_KEPERLUAN_CEPAT = [
  "Konsultasi Paket Umroh",
  "Pendaftaran Jamaah Baru",
  "Tanya Jadwal & Harga Paket",
  "Informasi Syarat & Paspor",
  "Silaturahmi / Kunjungan Kantor",
];

function BukuTamuForm() {
  const searchParams = useSearchParams();

  // Extract query parameters
  const rawPhone =
    searchParams.get("phone") ||
    searchParams.get("wa") ||
    searchParams.get("nomor") ||
    "";
  const adminParam = searchParams.get("admin") || searchParams.get("adminId") || "";
  const kantorParam = searchParams.get("kantor") || "";

  // Normalize phone number if present in URL
  let initialPhone = rawPhone.replace(/[^0-9]/g, "");
  if (initialPhone.startsWith("62")) {
    initialPhone = "0" + initialPhone.slice(2);
  } else if (initialPhone.startsWith("8")) {
    initialPhone = "0" + initialPhone;
  }

  const isAutoFilledPhone = Boolean(initialPhone);

  const [namaTamu, setNamaTamu] = useState("");
  const [nomorWa, setNomorWa] = useState(initialPhone);
  const [keperluan, setKeperluan] = useState("Konsultasi Paket Umroh");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync if query param loads later
  useEffect(() => {
    if (initialPhone && !nomorWa) {
      setNomorWa(initialPhone);
    }
  }, [initialPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!namaTamu.trim()) {
      setErrorMessage("Nama lengkap jamaah wajib diisi");
      return;
    }

    if (!nomorWa.trim()) {
      setErrorMessage("Nomor WhatsApp wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/buku-tamu/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaTamu: namaTamu.trim(),
          nomorWa: nomorWa.trim(),
          keperluan: keperluan.trim() || "Konsultasi Paket Umroh",
          adminId: adminParam || undefined,
          adminName: adminParam || undefined,
          kantorCabang: kantorParam || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmittedName(namaTamu.trim());
        setIsSuccess(true);
      } else {
        setErrorMessage(json.message || "Gagal menyimpan buku tamu. Silakan coba lagi.");
      }
    } catch (err: any) {
      setErrorMessage("Terjadi kesalahan jaringan: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(4,120,87,0.25)] border border-emerald-500/30 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5 border-2 border-emerald-300">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Buku Tamu Terverifikasi
        </span>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Alhamdulillah, Terima Kasih!
        </h2>

        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
          {submittedName}
        </p>

        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          Kunjungan dan data Anda telah tercatat di sistem <strong>VTU ABADI Travel</strong>. Konsultan kami akan segera melayani keperluan ibadah Anda dengan sepenuh hati.
        </p>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-stone-800 flex flex-col gap-2.5">
          <a
            href="https://wa.me/6281234567890?text=Halo%20VTU%20ABADI,%20saya%20sudah%20mengisi%20buku%20tamu"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <HeartHandshake className="w-4 h-4 text-amber-300" />
            <span>Chat WhatsApp Konsultan</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              setNamaTamu("");
              setKeperluan("Konsultasi Paket Umroh");
            }}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline pt-1"
          >
            Isi Buku Tamu Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(4,120,87,0.22)] border-2 border-emerald-500/30 overflow-hidden">
      {/* Header Form */}
      <div className="p-6 sm:p-7 bg-gradient-to-br from-emerald-900 via-teal-900 to-[#032d20] text-white relative">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shadow-md border border-amber-300 shrink-0">
            <BookText className="w-6 h-6 text-slate-950" />
          </div>
          {kantorParam && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-white/10 text-amber-300 border border-amber-400/40 backdrop-blur-md">
              <MapPin className="w-3 h-3" />
              Kantor {kantorParam}
            </span>
          )}
        </div>

        <div className="mt-4">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Buku Tamu Kunjungan
          </h1>
          <p className="text-xs text-emerald-100/80 font-medium mt-1 leading-relaxed">
            Selamat datang di <strong>VTU ABADI Travel</strong>. Mohon kesediaannya mengisi data singkat di bawah ini.
          </p>
        </div>

        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Body Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* 1. Nama Lengkap Jamaah */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Nama Lengkap Jamaah</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={namaTamu}
            onChange={(e) => setNamaTamu(e.target.value)}
            placeholder="Contoh: H. Ahmad Fauzi / Hj. Siti Aminah"
            className="w-full px-4 py-3 rounded-xl text-sm border-2 border-slate-200 dark:border-stone-700 bg-slate-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-hidden transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>

        {/* 2. Nomor WhatsApp (Terisi Otomatis) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Nomor WhatsApp</span>
              <span className="text-rose-500">*</span>
            </label>
            {isAutoFilledPhone && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Terisi Otomatis
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              required
              value={nomorWa}
              onChange={(e) => setNomorWa(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono border-2 border-slate-200 dark:border-stone-700 bg-slate-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-hidden transition-all text-slate-900 dark:text-white"
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Digunakan untuk pengiriman jadwal, flyer brosur, dan penawaran paket umroh.
          </p>
        </div>

        {/* 3. Keperluan / Rencana Ibadah */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Keperluan / Rencana Ibadah</span>
          </label>
          <input
            type="text"
            value={keperluan}
            onChange={(e) => setKeperluan(e.target.value)}
            placeholder="Contoh: Konsultasi Paket Umroh 11 Hari"
            className="w-full px-4 py-2.5 rounded-xl text-sm border-2 border-slate-200 dark:border-stone-700 bg-slate-50/70 dark:bg-stone-800/60 focus:bg-white dark:focus:bg-stone-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-hidden transition-all font-medium text-slate-900 dark:text-white"
          />

          {/* Quick Option Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {OPSI_KEPERLUAN_CEPAT.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setKeperluan(opt)}
                className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  keperluan === opt
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-stone-700 hover:border-emerald-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-[0_4px_18px_rgba(5,150,105,0.4)] border border-emerald-400/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Menyimpan Buku Tamu...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-300" />
                <span>Kirim Buku Tamu</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
          Data Anda aman & dirahasiakan oleh manajemen VTU ABADI Tour & Travel.
        </p>
      </form>
    </div>
  );
}

export default function BukuTamuPublicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-[#064e3b] to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content wrapped in Suspense for useSearchParams */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-white font-bold gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span>Memuat Buku Tamu...</span>
          </div>
        }
      >
        <BukuTamuForm />
      </Suspense>

      {/* Footer Branding */}
      <div className="mt-6 text-center text-emerald-200/60 text-xs font-semibold">
        © {new Date().getFullYear()} VTU ABADI Travel — Solusi Ibadah Nyaman & Berkah
      </div>
    </div>
  );
}
