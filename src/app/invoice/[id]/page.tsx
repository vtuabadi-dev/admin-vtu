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
          // Fallback minimal object for direct invoice numbers
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
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-600">Memuat Kwitansi & Dokumen Resmi VTU ABADI...</p>
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
  const kurangBayarVal = data?.sisaTagihan !== undefined ? data.sisaTagihan : Math.max(0, totalTagihanVal - totalBayarVal);

  return (
    <div className="min-h-screen bg-stone-200/70 text-stone-900 py-6 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Action Topbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl shadow-xs border border-stone-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-xl">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Kwitansi Resmi PT Vauza Tamma Abadi</p>
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

        {/* Paper Container matching Vauza Tamma Official Kwitansi */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-300 p-5 sm:p-8 space-y-4">
          {/* Header Grid: Logo & Kwitansi Box */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-4">
            {/* Logo & Company Title */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-rose-600 flex items-center justify-center p-1 bg-emerald-50 text-emerald-800 font-black text-xs">
                VTU
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-stone-900 leading-none">Vauza Tamma</h2>
                <p className="text-xs font-bold tracking-widest text-stone-700 mt-0.5">HAJI & UMROH</p>
                <p className="text-[9px] font-bold text-teal-700 mt-0.5">IZIN PPIU NO.U493 TAHUN 2021</p>
              </div>
            </div>

            {/* Kwitansi Box (Green Bar + Meta Table) */}
            <div className="w-full sm:w-56 text-right">
              <h3 className="font-serif text-lg font-bold text-stone-900 pr-1">KWITANSI</h3>
              <div className="bg-emerald-800 text-white font-mono text-[11px] font-bold text-center py-1 px-2 rounded-t">
                {data?.invoiceNumber}
              </div>
              <div className="border border-stone-300 text-[10px] bg-stone-50/50 divide-y divide-stone-200 text-left font-mono">
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-bold text-stone-600">TANGGAL</span>
                  <span className="text-stone-900 font-semibold">{data?.invoiceDate || "-"}</span>
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-bold text-stone-600">ID REG</span>
                  <span className="text-stone-900 font-semibold">{data?.idReg || "3575"}</span>
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-bold text-stone-600">KODE</span>
                  <span className="text-stone-900 font-semibold">{data?.kode || "104"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kepada Yth Bapak/Ibu Block */}
          <div className="text-xs text-stone-800 space-y-1 bg-stone-50/60 p-3 rounded-xl border border-stone-200">
            <p className="font-bold text-stone-500">Kepada Yth Bapak/ Ibu</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 pt-1">
              <span className="font-bold text-stone-600 sm:col-span-1">Nama</span>
              <span className="font-bold text-stone-900 sm:col-span-3">: {(data?.namaGroup || "BAPAK/IBU JAMAAH").toUpperCase()}</span>

              <span className="font-bold text-stone-600 sm:col-span-1">Alamat</span>
              <span className="text-stone-700 sm:col-span-3">: {data?.alamat || "-"} {data?.telepon ? `/ ${data.telepon}` : ""}</span>

              <span className="font-bold text-stone-600 sm:col-span-1">Paket Umroh</span>
              <span className="text-stone-900 font-semibold sm:col-span-3">
                : {(data?.namaPaket || "PAKET UMROH VTU ABADI").toUpperCase()} <span className="text-stone-500">({data?.tipePaket || "SILVER"})</span>
              </span>

              <span className="font-bold text-stone-600 sm:col-span-1">Jumlah</span>
              <span className="text-stone-900 font-semibold sm:col-span-3">: {paxCount} Pax</span>
            </div>
          </div>

          {/* Table 1: Rincian Tagihan & Biaya Paket */}
          <div className="border border-stone-300 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-emerald-800 text-white font-bold text-[11px]">
                <tr>
                  <th className="py-1.5 px-3">Keterangan</th>
                  <th className="py-1.5 px-3 text-right w-28">Harga</th>
                  <th className="py-1.5 px-3 text-center w-14">Qty</th>
                  <th className="py-1.5 px-3 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-900">
                {/* Row 1: Paket Umroh */}
                <tr>
                  <td className="py-2 px-3 font-semibold">
                    {(data?.namaPaket || "PAKET UMROH VTU ABADI").toUpperCase()} ({data?.tipePaket || "SILVER"})
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{formatRp(unitPrice)}</td>
                  <td className="py-2 px-3 text-center font-mono">{paxCount}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{formatRp(subtotalBase)}</td>
                </tr>

                {/* Additional Order Items */}
                {data?.orderItems && data.orderItems.length > 0 && (
                  data.orderItems.map((item, idx) => (
                    <tr key={item.id || idx} className="bg-amber-50/20">
                      <td className="py-1.5 px-3 font-medium">
                        {item.nama.toUpperCase()}
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

                {/* Anggota Jamaah Section (A/N) */}
                {data?.anggota && data.anggota.length > 0 && (
                  <>
                    <tr className="bg-stone-50/50">
                      <td colSpan={3} className="py-1 px-3 font-bold text-stone-700">A/N</td>
                      <td className="py-1 px-3 text-right font-mono text-stone-400">Rp -</td>
                    </tr>
                    {data.anggota.map((nama, idx) => (
                      <tr key={nama + idx} className="bg-stone-50/50">
                        <td colSpan={3} className="py-1 px-3 pl-6 font-medium text-stone-800">
                          {idx + 1}. {nama.toUpperCase()}
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-stone-400">Rp -</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Hotel Makkah & Madinah Information */}
                <tr className="bg-stone-50/30">
                  <td colSpan={3} className="py-1.5 px-3 text-stone-700 font-bold">
                    HOTEL MAKKAH: {(data?.hotelMekkah || "GRAND AL MASSA").toUpperCase()}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-stone-400">Rp -</td>
                </tr>
                <tr className="bg-stone-50/30">
                  <td colSpan={3} className="py-1.5 px-3 text-stone-700 font-bold">
                    HOTEL MADINAH: {(data?.hotelMadinah || "DURRAT AL EIMAN").toUpperCase()}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-stone-400">Rp -</td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-stone-300 font-bold bg-stone-100">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-center text-stone-900 text-xs">Total Tagihan</td>
                  <td className="py-2 px-3 text-right font-mono text-stone-900 text-xs font-black">
                    {formatRp(totalTagihanVal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table 2: Rincian Pembayaran (History) */}
          <div className="border border-stone-300 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-emerald-800 text-white font-bold text-[11px]">
                <tr>
                  <th colSpan={2} className="py-1.5 px-3 text-center">Rincian Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-900">
                {data?.paymentHistory && data.paymentHistory.length > 0 ? (
                  data.paymentHistory.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-3 font-mono font-medium">{p.tanggal} {p.metode.toUpperCase()}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{formatRp(p.nominal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 px-3 font-mono font-medium">{data?.invoiceDate || "-"} TF MANDIRI</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">{formatRp(data?.nominal || 0)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-stone-300 font-bold divide-y divide-stone-200 bg-stone-50">
                <tr>
                  <td className="py-1.5 px-3 text-center text-stone-800">Total Bayar</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-stone-900">{formatRp(totalBayarVal)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-stone-900">Kurang Bayar</td>
                  <td className="py-1.5 px-3 text-right font-mono font-black text-rose-700">{formatRp(kurangBayarVal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* NB Batas Pelunasan */}
          <div className="text-xs font-bold pt-1">
            <span className="text-rose-600 font-black">NB : </span>
            <span className="text-stone-800">MAKSIMAL PELUNASAN TANGGAL = </span>
            <span className="text-stone-900 font-mono">{data?.maksimalPelunasan || "6 September 2026"}</span>
          </div>

          {/* Signatures Area */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="font-bold text-xs text-stone-900">PT VAUZA TAMMA ABADI</p>
              <p className="text-[11px] text-stone-600">Issued Approve by</p>
              <div className="h-12 flex items-center">
                <span className="text-xs font-bold text-sky-600 border border-dashed border-sky-400 px-3 py-1 rounded-lg">
                  ✓ Verified by Vauza Tamma
                </span>
              </div>
              <p className="font-extrabold text-xs text-stone-900">H. FAISAL WAHYUDI</p>
            </div>

            <div className="text-right space-y-1">
              <p className="font-bold text-xs text-stone-900">Accept by</p>
              <div className="h-12" />
              <p className="font-extrabold text-xs text-stone-900">{(data?.namaGroup || "MIA HERAWATI").toUpperCase()}</p>
            </div>
          </div>

          {/* Green Bank Account Box */}
          <div className="bg-emerald-800 text-white p-3 rounded-xl text-center text-[10.5px] space-y-0.5">
            <p className="font-bold">Untuk pembayaran melalui rekening bank sebagai berikut :</p>
            <p className="font-mono font-extrabold">Nomor Rekening 144-00-0018881-0, Bank MANDIRI a/n PT VAUZA TAMMA ABADI</p>
            <p className="text-[10px] text-emerald-100">Pelunasan biaya paket paling lambat H-40 sebelum tanggal keberangkatan</p>
            <p className="text-[9.5px] text-emerald-200">Setelah melakukan pembayaran, harap menginformasikan dan mengirimkan bukti pembayaran</p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-stone-500 pb-6">
          Dokumen Kwitansi Resmi Elektronik • PT Vauza Tamma Abadi (VTU ABADI Travel)
        </p>
      </div>
    </div>
  );
}
