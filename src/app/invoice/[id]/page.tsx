"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Printer,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { downloadInvoicePdf, type InvoicePdfData } from "@/shared/lib/invoice-pdf";

export default function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const rawId = resolvedParams?.id || "";
  const kode = searchParams.get("kode") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<InvoicePdfData | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      if (!rawId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/public/${encodeURIComponent(rawId)}?kode=${encodeURIComponent(kode)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setData({
            invoiceNumber: decodeURIComponent(rawId),
            namaGroup: "BAPAK/IBU JAMAAH",
            kodeRegistrasi: kode || "-",
            jenisPembayaran: "Pembayaran Umroh",
            nominal: 0,
            invoiceDate: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
          });
        }
      } catch {
        setError("Gagal memuat detail invoice. Silakan coba beberapa saat lagi.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [rawId, kode]);

  const handleDownload = () => {
    if (!data) return;
    downloadInvoicePdf(data);
  };

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-600">Memuat Invoice & Dokumen Resmi VTU ABADI...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-stone-200 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-stone-900">Dokumen Tidak Ditemukan</h2>
          <p className="text-xs text-stone-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const paxCount = data?.jumlahPax || data?.anggota?.length || 2;
  const unitPrice = data?.hargaSatuanPaket || Math.round((data?.totalTagihan || 74800000) / paxCount);
  const subtotalBase = unitPrice * paxCount;
  const totalTagihanVal = data?.totalTagihanDisesuaikan || data?.totalTagihan || subtotalBase;
  const totalBayarVal = data?.totalPembayaran || data?.nominal || 0;
  const sisaTagihanVal = data?.sisaTagihan !== undefined ? data.sisaTagihan : Math.max(0, totalTagihanVal - totalBayarVal);
  const isLunas = sisaTagihanVal <= 0;

  // Format tanggal for display
  const formatTanggalDisplay = (dateStr?: string) => {
    if (!dateStr) return "-";
    // Try to parse as date
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      }
    }
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-stone-200/70 text-stone-900 py-6 px-3 sm:px-6 print:bg-white print:py-0 print:px-0">
      <div className="max-w-[210mm] mx-auto space-y-3">
        {/* Action Topbar (hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl shadow-xs border border-stone-300 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Invoice Resmi PT Vauza Tamma Abadi</p>
              <h1 className="text-xs sm:text-sm font-extrabold text-stone-900 font-mono">{data?.invoiceNumber}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh File PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-stone-300 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* Paper Container — Formal Invoice Template          */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-300 print:rounded-none print:shadow-none print:border-none" style={{ fontFamily: "'Times New Roman', 'Georgia', serif" }}>
          
          {/* ─── HEADER: Logo + INVOICE ─── */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 px-6 sm:px-10 pt-6 sm:pt-8 pb-4">
            {/* Logo & Company */}
            <div className="flex items-center gap-3">
              <img 
                src="/images/vauza-tamma-logo-full.png" 
                alt="Logo Vauza Tamma Haji & Umroh" 
                className="h-14 sm:h-[72px] w-auto object-contain"
              />
            </div>

            {/* INVOICE Title + Number */}
            <div className="text-right">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>INVOICE</h2>
              <div className="mt-1 bg-emerald-800 text-white font-mono text-xs sm:text-sm font-bold text-center py-1.5 px-4 rounded-sm inline-block">
                {data?.invoiceNumber || "INV.VT/2026/VIII/00045"}
              </div>
              {/* Tanggal Invoice + Jatuh Tempo */}
              <div className="mt-2 text-[11px] space-y-0.5">
                <div className="flex justify-end gap-3">
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Tanggal Invoice</span>
                  <span className="font-semibold text-stone-900 min-w-[120px] text-left border-b border-stone-200 pb-0.5">{formatTanggalDisplay(data?.invoiceDate)}</span>
                </div>
                <div className="flex justify-end gap-3">
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Jatuh Tempo</span>
                  <span className="font-semibold text-stone-900 min-w-[120px] text-left border-b border-stone-200 pb-0.5">{data?.maksimalPelunasan || data?.dueDate || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── TWO COLUMNS: Data Pendaftar + Detail Paket Umroh ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 sm:px-10 pb-4">
            {/* Data Pendaftar */}
            <div className="border border-stone-300 rounded-md overflow-hidden">
              <div className="bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full bg-white/20 text-center text-[10px] leading-4">📋</span>
                DATA PENDAFTAR
              </div>
              <div className="p-3 text-xs space-y-2.5">
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Nama Pendaftar</span>
                  <span>:</span>
                  <span className="font-bold text-stone-900">{(data?.namaGroup || "Bapak Ahmad Firdaus").toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">No. HP / WhatsApp</span>
                  <span>:</span>
                  <span className="text-stone-800">{data?.telepon || data?.picPhone || "-"}</span>
                </div>
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Kode Registrasi</span>
                  <span>:</span>
                  <span className="font-mono text-stone-900 font-bold">{data?.kodeRegistrasi || "-"}</span>
                </div>
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Alamat</span>
                  <span>:</span>
                  <span className="text-stone-700 leading-snug">{data?.alamat || "-"}</span>
                </div>
              </div>
            </div>

            {/* Detail Paket Umroh */}
            <div className="border border-stone-300 rounded-md overflow-hidden">
              <div className="bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full bg-white/20 text-center text-[10px] leading-4">🕌</span>
                DETAIL PAKET UMROH
              </div>
              <div className="p-3 text-xs space-y-2.5">
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Paket Umroh</span>
                  <span>:</span>
                  <span className="font-bold text-stone-900">{data?.namaPaket || "Umroh Plus 12 Hari"}</span>
                </div>
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Jumlah Pendaftar</span>
                  <span>:</span>
                  <span className="text-stone-800">{paxCount} Pax</span>
                </div>
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Hotel Makkah</span>
                  <span>:</span>
                  <span className="text-stone-800">{data?.hotelMekkah || "-"}</span>
                </div>
                <div className="grid grid-cols-[120px_8px_1fr]">
                  <span className="font-semibold text-stone-600">Hotel Madinah</span>
                  <span>:</span>
                  <span className="text-stone-800">{data?.hotelMadinah || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── TABLE 1: RINCIAN PEMBAYARAN ─── */}
          <div className="px-6 sm:px-10 pb-4">
            <div className="border border-stone-300 rounded-md overflow-hidden text-xs">
              <div className="bg-emerald-800 text-white text-xs font-bold px-3 py-1.5">
                RINCIAN PEMBAYARAN
              </div>
              <table className="w-full text-left">
                <thead className="bg-stone-100 text-stone-700 text-[11px] font-bold border-b border-stone-300">
                  <tr>
                    <th className="py-1.5 px-3 w-10 text-center">No.</th>
                    <th className="py-1.5 px-3">Uraian</th>
                    <th className="py-1.5 px-3 text-right w-28">Harga Satuan (Rp)</th>
                    <th className="py-1.5 px-3 text-center w-20">Quantity</th>
                    <th className="py-1.5 px-3 text-right w-32">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-stone-900">
                  {/* Row 1: Paket Umroh */}
                  <tr>
                    <td className="py-2 px-3 text-center font-mono">1</td>
                    <td className="py-2 px-3 font-semibold">
                      {data?.namaPaket || "Paket Umroh Plus 12 Hari"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatRp(unitPrice)}</td>
                    <td className="py-2 px-3 text-center font-mono">{paxCount} Pax</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{formatRp(subtotalBase)}</td>
                  </tr>

                  {/* Additional Order Items */}
                  {data?.orderItems && data.orderItems.length > 0 && (
                    data.orderItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-1.5 px-3 text-center font-mono">{idx + 2}</td>
                        <td className="py-1.5 px-3 font-medium">
                          {item.nama}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          {item.tipe === "penambahan" ? "" : "-"}
                          {formatRp(item.hargaSatuan || Math.round(item.nominal / (item.qty || paxCount || 1)))}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono">{item.qty || paxCount || 1}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold">
                          {item.tipe === "penambahan" ? "" : "-"}
                          {formatRp(item.nominal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── TABLE 2: RIWAYAT PEMBAYARAN ─── */}
          <div className="px-6 sm:px-10 pb-4">
            <div className="border border-stone-300 rounded-md overflow-hidden text-xs">
              <div className="bg-emerald-800 text-white text-xs font-bold px-3 py-1.5">
                RIWAYAT PEMBAYARAN
              </div>
              <table className="w-full text-left">
                <thead className="bg-stone-100 text-stone-700 text-[11px] font-bold border-b border-stone-300">
                  <tr>
                    <th className="py-1.5 px-3 w-10 text-center">No.</th>
                    <th className="py-1.5 px-3 w-28">Tanggal</th>
                    <th className="py-1.5 px-3">Metode Pembayaran</th>
                    <th className="py-1.5 px-3 text-right w-28">Nominal (Rp)</th>
                    <th className="py-1.5 px-3 w-36">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-stone-900">
                  {data?.paymentHistory && data.paymentHistory.length > 0 ? (
                    data.paymentHistory.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 text-center font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono">{p.tanggal}</td>
                        <td className="py-1.5 px-3">{p.metode}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold">{formatRp(p.nominal)}</td>
                        <td className="py-1.5 px-3 text-stone-600">
                          {idx === 0 ? "DP Pendaftaran" : `Pelunasan Tahap ${idx}`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-1.5 px-3 text-center font-mono">1</td>
                      <td className="py-1.5 px-3 font-mono">{data?.invoiceDate || "-"}</td>
                      <td className="py-1.5 px-3">{data?.bank ? `Transfer Bank ${data.bank}` : "Transfer Bank Mandiri"}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{formatRp(data?.nominal || 0)}</td>
                      <td className="py-1.5 px-3 text-stone-600">DP Pendaftaran</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── SUMMARY + CATATAN PENTING ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 sm:px-10 pb-4">
            {/* Summary Box */}
            <div className="border border-stone-300 rounded-md p-3 text-xs space-y-2">
              <div className="grid grid-cols-[140px_8px_1fr]">
                <span className="font-bold text-stone-700">Total Tagihan</span>
                <span className="font-bold">:</span>
                <span className="font-bold text-stone-900">Rp {formatRp(totalTagihanVal)}</span>
              </div>
              <div className="grid grid-cols-[140px_8px_1fr]">
                <span className="font-bold text-stone-700">Total Sudah Dibayar</span>
                <span className="font-bold">:</span>
                <span className="font-bold text-stone-900">Rp {formatRp(totalBayarVal)}</span>
              </div>
              <div className="grid grid-cols-[140px_8px_1fr]">
                <span className="font-bold text-stone-700">Sisa Tagihan</span>
                <span className="font-bold">:</span>
                <span className={`font-black ${isLunas ? "text-emerald-700" : "text-rose-600"}`}>Rp {formatRp(sisaTagihanVal)}</span>
              </div>
              <div className="grid grid-cols-[140px_8px_1fr] pt-1 border-t border-stone-200">
                <span className="font-bold text-stone-700">Status Pembayaran</span>
                <span className="font-bold">:</span>
                <span className={`font-black text-[11px] px-2 py-0.5 rounded inline-block ${isLunas ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                  {isLunas ? "LUNAS" : "BELUM LUNAS"}
                </span>
              </div>
            </div>

            {/* Catatan Penting */}
            <div className="border border-stone-300 rounded-md overflow-hidden">
              <div className="bg-emerald-800 text-white text-[11px] font-bold px-3 py-1.5">
                CATATAN PENTING
              </div>
              <div className="p-3 text-[10.5px] text-stone-700 space-y-1.5">
                <p>• Untuk pembayaran melalui Nomor Rekening <strong className="text-stone-900">144-00-0018881-0</strong>, Bank <strong className="text-stone-900">MANDIRI</strong> a/n <strong className="text-stone-900">PT VAUZA TAMMA ABADI</strong>.</p>
                <p>• Setelah melakukan pembayaran, harap menginformasikan dan mengirimkan bukti pembayaran.</p>
              </div>
            </div>
          </div>

          {/* ─── SIGNATURE + QR CODE ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 sm:px-10 pb-4 border-t border-stone-200 pt-4">
            {/* Signature Left */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-stone-900">PT VAUZA TAMMA ABADI</p>
              <p className="text-[11px] text-stone-500 italic">Issued / Approved by</p>
              <div className="h-14 flex items-center">
                <img
                  src="/images/vauza-tamma-logo-full.png"
                  alt="Stamp Vauza Tamma"
                  className="h-10 w-auto opacity-80"
                />
              </div>
              <p className="text-xs font-extrabold text-stone-900 border-t border-stone-400 pt-1 inline-block">H. FAISAL WAHYUDI</p>
            </div>

            {/* QR Code / Verification */}
            <div className="text-right space-y-1">
              <p className="text-xs font-bold text-stone-900">VERIFIKASI KEASLIAN</p>
              <div className="inline-flex items-center gap-3">
                {/* QR Placeholder */}
                <div className="w-16 h-16 bg-stone-100 border border-stone-300 rounded flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-14 h-14 text-stone-400">
                    <rect x="5" y="5" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="65" y="5" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="5" y="65" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="40" y="40" width="20" height="20" fill="currentColor" rx="2" />
                    <rect x="65" y="65" width="10" height="10" fill="currentColor" rx="1" />
                    <rect x="80" y="65" width="15" height="10" fill="currentColor" rx="1" />
                    <rect x="65" y="80" width="10" height="15" fill="currentColor" rx="1" />
                    <rect x="80" y="80" width="15" height="15" fill="currentColor" rx="1" />
                    <rect x="10" y="10" width="20" height="20" fill="white" rx="1" />
                    <rect x="70" y="10" width="20" height="20" fill="white" rx="1" />
                    <rect x="10" y="70" width="20" height="20" fill="white" rx="1" />
                    <rect x="15" y="15" width="10" height="10" fill="currentColor" rx="1" />
                    <rect x="75" y="15" width="10" height="10" fill="currentColor" rx="1" />
                    <rect x="15" y="75" width="10" height="10" fill="currentColor" rx="1" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[9.5px] text-stone-500 leading-snug max-w-[140px]">
                    Scan untuk memverifikasi keaslian invoice.
                    Invoice ini diterbitkan secara resmi oleh PT Vauza Tamma Abadi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── FOOTER: Alamat Kantor ─── */}
          <div className="bg-emerald-800 text-white px-6 sm:px-10 py-3 rounded-b-2xl print:rounded-none text-center space-y-0.5" style={{ fontSize: "9px" }}>
            <p>Jl. Kauman No. 21, Kauman, Klojen, Kota Malang</p>
            <p>Jl. Kemang Timur Dalam No. 18B, Bangka, Mampang Prapatan, Kota Jakarta Selatan</p>
            <p>Royal Residence Cluster Crown Hill B15 No. 61, Sumur Welut, Lakarsantri, Kota Surabaya</p>
            <div className="flex items-center justify-center gap-4 pt-1 border-t border-white/20 mt-1">
              <span>📞 (0341) 399059 / 081-776655-000</span>
              <span>✉️ vauzatammapremium77@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Footer info (hidden on print) */}
        <p className="text-center text-xs text-stone-500 pb-6 print:hidden">
          Dokumen Invoice Resmi Elektronik • PT Vauza Tamma Abadi (VTU ABADI Travel)
        </p>
      </div>
    </div>
  );
}
