"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Printer,
  ShieldCheck,
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
          // Fallback minimal object for direct invoice numbers
          setData({
            invoiceNumber: decodeURIComponent(rawId),
            namaGroup: "Bapak/Ibu Jamaah",
            kodeRegistrasi: kode || "-",
            jenisPembayaran: "Pembayaran Umroh",
            nominal: 0,
            invoiceDate: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
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
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-600">Memuat Dokumen Invoice Resmi VTU ABADI...</p>
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

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Action Topbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Dokumen Invoice Resmi</p>
              <h1 className="text-sm font-bold text-stone-900">{data?.invoiceNumber}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Unduh File PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-stone-300 transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Invoice Main Paper Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          {/* Header Green Banner */}
          <div className="bg-emerald-700 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-[11px] font-bold text-emerald-200 border border-emerald-600 mb-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Kuitansi & Invoice Resmi
                </div>
                <h2 className="text-2xl font-black tracking-tight">PT VAUZA TAMMA ABADI</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  VTU ABADI Travel — Izin Kemenag RI No. U.412 Tahun 2020
                </p>
              </div>

              <div className="text-left sm:text-right bg-emerald-800/60 p-3 rounded-xl border border-emerald-600/50">
                <span className="text-[10px] uppercase font-bold text-amber-300">Nomor Invoice</span>
                <p className="font-mono text-base font-extrabold text-white">{data?.invoiceNumber}</p>
                <p className="text-[11px] text-emerald-200 mt-0.5">Tgl: {data?.invoiceDate || "-"}</p>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta Cards: Billed To vs Transaction Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                  Tagihan Resmi Kepada:
                </span>
                <p className="text-base font-bold text-stone-900">{data?.namaGroup}</p>
                <div className="text-xs text-stone-600 space-y-0.5 pt-1">
                  <p><span className="text-stone-400">Kode Reg:</span> {data?.kodeRegistrasi}</p>
                  <p><span className="text-stone-400">Paket Umroh:</span> {data?.namaPaket || "Paket Umroh VTU"}</p>
                  {data?.tanggalBerangkat && (
                    <p><span className="text-stone-400">Tgl Berangkat:</span> {data?.tanggalBerangkat}</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                    Detail Pembayaran:
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold border border-emerald-200">
                    STATUS: LUNAS / TERVERIFIKASI
                  </span>
                </div>
                <div className="text-xs text-stone-600 space-y-1 pt-1">
                  <p><span className="text-stone-400">Jenis:</span> {data?.jenisPembayaran}</p>
                  <p><span className="text-stone-400">Metode:</span> {data?.metode || "Transfer"} - {data?.bank || "Bank Transfer"}</p>
                  <p><span className="text-stone-400">Jatuh Tempo:</span> {data?.dueDate || "Sesuai Jadwal"}</p>
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-50/70 border-b border-stone-200 text-emerald-900 font-bold">
                  <tr>
                    <th className="py-2.5 px-4 w-10 text-center">No</th>
                    <th className="py-2.5 px-4">Deskripsi Pembayaran / Layanan</th>
                    <th className="py-2.5 px-4">Metode</th>
                    <th className="py-2.5 px-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="py-3 px-4 text-center text-stone-500 font-medium">1</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {data?.jenisPembayaran || "Pembayaran Umroh"}
                      {data?.catatan && (
                        <p className="text-[11px] text-stone-500 font-normal mt-0.5">{data.catatan}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-600">{data?.bank || "Transfer Bank"}</td>
                    <td className="py-3 px-4 text-right font-bold text-stone-900 font-mono">
                      {formatRp(data?.nominal || 0)}
                    </td>
                  </tr>

                  {data?.orderItems && data.orderItems.length > 0 && (
                    data.orderItems.map((item, idx) => (
                      <tr key={item.id || idx} className="bg-amber-50/20">
                        <td className="py-2.5 px-4 text-center text-stone-500 font-medium">{idx + 2}</td>
                        <td className="py-2.5 px-4 font-semibold text-stone-900">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold mr-1.5 ${
                            item.tipe === "penambahan" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {item.tipe === "penambahan" ? "+ Beban" : "- Diskon"}
                          </span>
                          {item.nama}
                        </td>
                        <td className="py-2.5 px-4 text-stone-600 capitalize">{item.kategori.replace(/_/g, " ")}</td>
                        <td className="py-2.5 px-4 text-right font-bold font-mono text-stone-900">
                          {item.tipe === "penambahan" ? "+" : "-"} {formatRp(item.nominal || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              <div className="text-xs text-stone-500 space-y-1 max-w-sm">
                <p className="font-bold text-stone-700">Catatan Resmi:</p>
                <p>1. Dokumen kuitansi & invoice ini sah diterbitkan secara elektronik oleh PT Vauza Tamma Abadi.</p>
                <p>2. Simpan dokumen ini sebagai tanda bukti pembayaran dan konfirmasi keberangkatan Anda.</p>
              </div>

              <div className="w-full sm:w-72 bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Biaya Paket Dasar:</span>
                  <span className="font-mono font-semibold">{formatRp(data?.totalTagihan || data?.nominal || 0)}</span>
                </div>
                {data?.totalBebanTambahan ? (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>+ Tambahan Beban:</span>
                    <span className="font-mono font-bold">+ {formatRp(data.totalBebanTambahan)}</span>
                  </div>
                ) : null}
                {data?.totalPengurangan ? (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>- Diskon / Potongan:</span>
                    <span className="font-mono font-bold">- {formatRp(data.totalPengurangan)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-stone-900 border-t pt-1.5">
                  <span>Pembayaran Invoice Ini:</span>
                  <span className="font-mono text-emerald-700">{formatRp(data?.nominal || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-700 border-t pt-1.5">
                  <span>Sisa Tagihan Setelah Ini:</span>
                  <span className="font-mono text-stone-900">{formatRp(data?.sisaTagihan || 0)}</span>
                </div>
              </div>
            </div>

            {/* Direct Download Button */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950">Unduh PDF Kuitansi Resmi</p>
                  <p className="text-[11px] text-emerald-700">Simpan salinan resmi PDF ke perangkat Anda.</p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Unduh PDF ({data?.invoiceNumber})
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 pb-6">
          © {new Date().getFullYear()} PT Vauza Tamma Abadi (VTU ABADI Travel). Seluruh hak cipta dilindungi undang-undang.
        </p>
      </div>
    </div>
  );
}
