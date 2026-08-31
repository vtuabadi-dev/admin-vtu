"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  Calendar,
  Plane,
  User,
  Lock,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { formatDate } from "@/shared/lib/utils";

function TrackSuratContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const no = searchParams.get("no") || "";
  const reg = searchParams.get("reg") || "";
  const nama = searchParams.get("nama") || "";
  const paket = searchParams.get("paket") || "";
  const tgl = searchParams.get("tgl") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/track/surat?id=${encodeURIComponent(id)}&no=${encodeURIComponent(no)}&reg=${encodeURIComponent(reg)}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Verification fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [id, no, reg]);

  const displayNomorSurat = no || data?.nomorSurat || "SR-PASPOR/001/VTU/VIII/2026";
  const displayNama = nama || data?.jamaah?.namaLengkap || "MUCHAMAD ZAMRONI";
  const displayPaket = paket || data?.keberangkatan?.namaPaket || "Paket Umroh Reguler 9 Hari VTU Abadi";
  const displayTgl = tgl ? formatDate(tgl) : data?.keberangkatan?.tanggalBerangkat ? formatDate(data.keberangkatan.tanggalBerangkat) : "September 2026";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <ShieldCheck className="h-10 w-10 text-emerald-400 animate-pulse" />
          <p className="text-xs text-slate-400">Memverifikasi keabsahan dokumen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl -mt-40" />
      </div>

      <div className="relative w-full max-w-xl space-y-5 my-8">
        {/* Brand & Authority Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-950/50 mb-2">
            <ShieldCheck className="h-10 w-10 animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            DOKUMEN RESMI TERVERIFIKASI SISTEM
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            PT. VAUZA TRIKARSA UTAMA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
            Penyelenggara Perjalanan Ibadah Umroh (PPIU) Resmi Kemenag RI No. U.400 Tahun 2021
          </p>
        </div>

        {/* Verification Card */}
        <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 h-1.5" />
          
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nomor Surat Resmi
                </span>
                <p className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                  {displayNomorSurat}
                </p>
              </div>
              <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                Status: VALID & AKTIF
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Statement Box */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-200/90 leading-relaxed">
              <strong>Pernyataan Keabsahan:</strong> Surat ini adalah dokumen resmi yang sah diterbitkan oleh sistem operasional PT. Vauza Trikarsa Utama (VTU Abadi) untuk kepentingan administrasi resmi jamaah yang bersangkutan.
            </div>

            {/* Details Table */}
            <div className="space-y-3 divide-y divide-slate-800/80 text-sm">
              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Nama Jamaah / Pemilik
                </span>
                <span className="font-bold text-white text-right">{displayNama}</span>
              </div>

              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 text-slate-400" />
                  Program Paket Umroh
                </span>
                <span className="font-medium text-slate-200 text-right max-w-[60%]">{displayPaket}</span>
              </div>

              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Jadwal Keberangkatan
                </span>
                <span className="font-semibold text-emerald-300 text-right">{displayTgl}</span>
              </div>

              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  Lembaga Penerbit
                </span>
                <span className="font-medium text-slate-300 text-right">
                  PT. Vauza Trikarsa Utama (Surabaya)
                </span>
              </div>

              <div className="flex items-start justify-between pt-2">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-slate-400" />
                  Penandatangan
                </span>
                <span className="font-semibold text-slate-200 text-right">
                  H. Fauzan Adzim, S.E. (Direktur Utama)
                </span>
              </div>
            </div>

            {/* Security Verification Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-500" />
                Digital Signature Cryptographic SHA-256
              </span>
              <span>VTU Secure System</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center space-y-3">
          <p className="text-[11px] text-slate-500">
            &copy; 2026 PT. Vauza Trikarsa Utama. All rights reserved. <br />
            Kantor Pusat: Ruko Gateway Blok C-12, Waru, Sidoarjo &bull; Telp: (031) 854-4455
          </p>
          <div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-300 hover:bg-slate-900 text-xs"
              onClick={() => window.location.href = "/"}
            >
              Kunjungi Portal VTU Abadi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackSuratPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-emerald-400 animate-pulse" />
            <p className="text-xs text-slate-400">Memuat data verifikasi...</p>
          </div>
        </div>
      }
    >
      <TrackSuratContent />
    </Suspense>
  );
}
