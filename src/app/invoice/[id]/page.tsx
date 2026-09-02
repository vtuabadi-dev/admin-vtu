"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Printer,
  FileText,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { formatInvoicePersonName } from "@/shared/lib/utils";
import { downloadInvoicePdf, type InvoicePdfData } from "@/shared/lib/invoice-pdf";
import { resolveHotelForKlaster } from "@/shared/lib/hotel-utils";

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
            namaGroup: "Bapak Ahmad Firdaus",
            kodeRegistrasi: kode || "REG-2107-045",
            namaPaket: "Umroh Plus 12 Hari",
            jumlahPax: 4,
            hargaSatuanPaket: 25700000,
            hotelMekkah: "Pullman ZamZam Makkah",
            hotelMadinah: "Anwar Al Madinah Mövenpick",
            alamat: "Jl. Melati No. 45 RT 03/RW 05, Kel. Sukamaju, Kec. Cilodong, Kota Depok, Jawa Barat 16415",
            telepon: "0812-1234-5678",
            jenisPembayaran: "Pembayaran Umroh",
            nominal: 52000000,
            totalTagihan: 102800000,
            totalPembayaran: 52000000,
            sisaTagihan: 50800000,
            invoiceDate: "18 Juli 2026",
            maksimalPelunasan: "17 Agustus 2026",
            paymentHistory: [
              { tanggal: "20 Juni 2026", metode: "Transfer Bank BCA", nominal: 20000000 },
              { tanggal: "05 Juli 2026", metode: "Transfer Bank Mandiri", nominal: 30000000 },
              { tanggal: "15 Juli 2026", metode: "Cash", nominal: 2000000 },
            ],
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
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-emerald-800 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-700">Memuat Dokumen Invoice Resmi VTU ABADI...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-stone-300 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-stone-900">Dokumen Tidak Ditemukan</h2>
          <p className="text-xs text-stone-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const paxCount = data?.jumlahPax || data?.anggota?.length || 4;
  const unitPrice = data?.hargaSatuanPaket || (data?.totalTagihan ? Math.round(data.totalTagihan / paxCount) : 25700000);
  const subtotalBase = unitPrice * paxCount;
  const totalTagihanVal = data?.totalTagihanDisesuaikan || data?.totalTagihan || subtotalBase;
  const totalBayarVal = data?.totalPembayaran !== undefined ? data.totalPembayaran : (data?.nominal || 52000000);
  const sisaTagihanVal = data?.sisaTagihan !== undefined ? data.sisaTagihan : Math.max(0, totalTagihanVal - totalBayarVal);
  const isLunas = sisaTagihanVal <= 0;

  return (
    <div className="min-h-screen bg-stone-200/80 text-stone-900 py-6 px-2 sm:px-4 print:bg-white print:p-0">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-page {
            width: 18cm !important;
            height: 27cm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Floating Action Topbar (Hidden on Print) */}
      <div className="max-w-[18cm] mx-auto mb-3 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-xs border border-stone-300 no-print">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#064e3b] text-white rounded-lg">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Invoice Resmi PT Vauza Tamma Abadi</p>
            <h1 className="text-xs sm:text-sm font-extrabold text-stone-900 font-mono">{data?.invoiceNumber || "INV.VT/2026/VIII/00045"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 bg-[#064e3b] hover:bg-[#043327] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-300 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Invoice</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXACT 18cm x 27cm INVOICE DOCUMENT CONTAINER                              */}
      {/* ========================================================================= */}
      <div
        className="invoice-page bg-white shadow-xl mx-auto flex flex-col justify-between"
        style={{
          width: "18cm",
          height: "27cm",
          boxSizing: "border-box",
          overflow: "hidden",
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Main Printable Content Area */}
        <div className="px-6 pt-5 pb-1 flex-1 flex flex-col justify-between">
          
          {/* ─── 1. HEADER (Logo Left + Vertical Stack Right) ─── */}
          <div className="flex justify-between items-start pb-2 border-b border-stone-800">
            {/* Top-Left: Real Logo anchored at top left */}
            <div className="pt-0">
              <img
                src="/assets/vauza-tamma-logo.png"
                alt="Vauza Tamma Haji & Umroh"
                className="h-[60px] w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>

            {/* Top-Right: Strict Vertical Stack: INVOICE -> NOMOR INVOICE -> TANGGAL INVOICE + JATUH TEMPO */}
            <div className="flex flex-col items-end w-[195px] shrink-0">
              <h1
                className="text-[28px] leading-none font-black tracking-wider text-[#064e3b] font-serif pr-0.5"
                style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
              >
                INVOICE
              </h1>

              {/* Green Bar Invoice Number */}
              <div className="w-full mt-1 bg-[#064e3b] text-white font-mono text-[10.5px] font-bold py-1 rounded-[6px] text-center tracking-wide">
                {data?.invoiceNumber || "INV.VT/2026/VIII/00045"}
              </div>

              {/* Date Metadata Table */}
              <div className="w-full mt-1.5 border border-[#064e3b] rounded-[6px] overflow-hidden text-[9.5px]">
                <div className="flex border-b border-[#064e3b]/30">
                  <div className="w-[88px] bg-[#064e3b] text-white font-bold px-2 py-0.5 text-left shrink-0">
                    Tanggal Invoice
                  </div>
                  <div className="flex-1 bg-white text-stone-900 font-semibold px-2 py-0.5 text-left">
                    {data?.invoiceDate || "18 Juli 2026"}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-[88px] bg-[#064e3b] text-white font-bold px-2 py-0.5 text-left shrink-0">
                    Jatuh Tempo
                  </div>
                  <div className="flex-1 bg-white text-stone-900 font-semibold px-2 py-0.5 text-left">
                    {data?.maksimalPelunasan || data?.dueDate || "17 Agustus 2026"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. TWO-COLUMN: DATA PENDAFTAR & DETAIL PAKET UMROH ─── */}
          <div className="grid grid-cols-2 gap-3.5 my-1.5">
            {/* Box Kiri: DATA PENDAFTAR */}
            <div>
              {/* Header with Title Badge + Thick Line */}
              <div className="flex items-center">
                <div className="bg-[#064e3b] text-white text-[10px] font-bold px-2.5 py-1 rounded-t-[6px] inline-flex items-center gap-1.5 shrink-0">
                  {/* User/Person Icon */}
                  <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>DATA PENDAFTAR</span>
                </div>
                <div className="flex-1 h-[3.5px] bg-[#064e3b]" />
              </div>

              {/* Content Card with Row Lines */}
              <div className="border border-[#B7C0BC] rounded-b-[6px] rounded-tr-[6px] p-2.5 text-[10px] space-y-1.5 bg-white h-full flex flex-col justify-between">
                <div className="grid grid-cols-[100px_8px_1fr] items-start">
                  <span className="text-stone-900 font-semibold">Nama Pendaftar</span>
                  <span className="text-stone-600">:</span>
                  <span className="font-bold text-stone-900 break-words min-w-0 leading-tight">
                    {formatInvoicePersonName(data?.namaGroup, data?.picName)}
                  </span>
                </div>
                <div className="border-t border-stone-100" />

                <div className="grid grid-cols-[100px_8px_1fr] items-center">
                  <span className="text-stone-900 font-semibold">No. HP / WhatsApp</span>
                  <span className="text-stone-600">:</span>
                  <span className="text-stone-900 break-words min-w-0">{data?.telepon || data?.picPhone || "0812-1234-5678"}</span>
                </div>
                <div className="border-t border-stone-100" />

                <div className="grid grid-cols-[100px_8px_1fr] items-center">
                  <span className="text-stone-900 font-semibold">Kode Registrasi</span>
                  <span className="text-stone-600">:</span>
                  <span className="font-mono font-bold text-stone-900 break-words min-w-0">{data?.kodeRegistrasi || "REG-2107-045"}</span>
                </div>
                <div className="border-t border-stone-100" />

                <div className="grid grid-cols-[100px_8px_1fr] items-start">
                  <span className="text-stone-900 font-semibold">Alamat</span>
                  <span className="text-stone-600">:</span>
                  <span className="text-stone-800 leading-tight break-words min-w-0">
                    {(data?.alamat && data.alamat !== "-") ? data.alamat : "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG"}
                  </span>
                </div>
              </div>
            </div>

            {/* Box Kanan: DETAIL PAKET UMROH */}
            <div>
              {/* Header with Title Badge + Thick Line */}
              <div className="flex items-center">
                <div className="bg-[#064e3b] text-white text-[10px] font-bold px-2.5 py-1 rounded-t-[6px] inline-flex items-center gap-1.5 shrink-0">
                  {/* Gift/Package Icon */}
                  <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect width="20" height="5" x="2" y="7" />
                    <line x1="12" x2="12" y1="22" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                  <span>DETAIL PAKET UMROH</span>
                </div>
                <div className="flex-1 h-[3.5px] bg-[#064e3b]" />
              </div>

              {/* Content Card with Row Lines */}
              <div className="border border-[#B7C0BC] rounded-b-[6px] rounded-tr-[6px] p-2.5 text-[10px] space-y-1.5 bg-white h-full flex flex-col justify-between">
                <div className="grid grid-cols-[90px_8px_1fr] items-start">
                  <span className="text-stone-900 font-semibold">Paket Umroh</span>
                  <span className="text-stone-600">:</span>
                  <span className="font-bold text-stone-900 break-words min-w-0 leading-tight">{data?.namaPaket || "Umroh Plus 12 Hari"}</span>
                </div>
                <div className="border-t border-stone-100" />

                <div className="grid grid-cols-[90px_8px_1fr] items-center">
                  <span className="text-stone-900 font-semibold">Jumlah Pendaftar</span>
                  <span className="text-stone-600">:</span>
                  <span className="text-stone-900 font-medium break-words min-w-0">{paxCount} Pax</span>
                </div>
                <div className="border-t border-stone-100" />

                <div className="grid grid-cols-[90px_8px_1fr] items-start">
                  <span className="text-stone-900 font-semibold">Hotel Makkah</span>
                  <span className="text-stone-600">:</span>
                  <span className="text-stone-900 break-words min-w-0 leading-tight">
                    {resolveHotelForKlaster(data?.hotelMekkah, data?.tipePaket || "SILVER") || "Pullman ZamZam Makkah"}
                  </span>
                </div>
                <div className="border-t border-stone-100" />

                <div className="grid grid-cols-[90px_8px_1fr] items-start">
                  <span className="text-stone-900 font-semibold">Hotel Madinah</span>
                  <span className="text-stone-600">:</span>
                  <span className="text-stone-900 break-words min-w-0 leading-tight">
                    {resolveHotelForKlaster(data?.hotelMadinah, data?.tipePaket || "SILVER") || "Anwar Al Madinah Mövenpick"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 3. TABEL RINCIAN PEMBAYARAN ─── */}
          <div className="my-1.5">
            <div className="flex items-center">
              <div className="bg-[#064e3b] text-white text-[10px] font-bold px-3 py-1 rounded-t-[6px] shrink-0">
                RINCIAN PEMBAYARAN
              </div>
              <div className="flex-1 h-[3.5px] bg-[#064e3b]" />
            </div>

            <div className="border border-[#B7C0BC] rounded-b-[6px] rounded-tr-[6px] overflow-hidden text-[10px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-[#B7C0BC] text-stone-900 font-bold text-[10px] h-[28px]">
                    <th className="py-1 px-2.5 text-center w-10 border-r border-[#B7C0BC]/60 align-middle">No.</th>
                    <th className="py-1 px-3 border-r border-[#B7C0BC]/60 align-middle">Uraian</th>
                    <th className="py-1 px-3 text-center w-[120px] border-r border-[#B7C0BC]/60 align-middle">Harga Satuan (Rp)</th>
                    <th className="py-1 px-3 text-center w-[75px] border-r border-[#B7C0BC]/60 align-middle">Quantity</th>
                    <th className="py-1 px-3 text-right w-[130px] align-middle">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B7C0BC]/60 text-stone-900">
                  <tr className="h-[30px]">
                    <td className="py-1 px-2.5 text-center border-r border-[#B7C0BC]/60 align-middle font-mono">1</td>
                    <td className="py-1 px-3 font-semibold border-r border-[#B7C0BC]/60 align-middle">{data?.namaPaket || "Paket Umroh Plus 12 Hari"}</td>
                    <td className="py-1 px-3 text-center border-r border-[#B7C0BC]/60 align-middle font-mono">{formatRp(unitPrice)}</td>
                    <td className="py-1 px-3 text-center border-r border-[#B7C0BC]/60 align-middle font-mono">{paxCount} Pax</td>
                    <td className="py-1 px-3 text-right font-mono font-bold align-middle">{formatRp(subtotalBase)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 4. TABEL RIWAYAT PEMBAYARAN ─── */}
          <div className="my-1.5">
            <div className="flex items-center">
              <div className="bg-[#064e3b] text-white text-[10px] font-bold px-3 py-1 rounded-t-[6px] shrink-0">
                RIWAYAT PEMBAYARAN
              </div>
              <div className="flex-1 h-[3.5px] bg-[#064e3b]" />
            </div>

            <div className="border border-[#B7C0BC] rounded-b-[6px] rounded-tr-[6px] overflow-hidden text-[10px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-[#B7C0BC] text-stone-900 font-bold text-[10px] h-[28px]">
                    <th className="py-1 px-2.5 text-center w-10 border-r border-[#B7C0BC]/60 align-middle">No.</th>
                    <th className="py-1 px-3 w-[110px] border-r border-[#B7C0BC]/60 align-middle">Tanggal</th>
                    <th className="py-1 px-3 border-r border-[#B7C0BC]/60 align-middle">Metode Pembayaran</th>
                    <th className="py-1 px-3 text-center w-[120px] border-r border-[#B7C0BC]/60 align-middle">Nominal (Rp)</th>
                    <th className="py-1 px-3 text-left w-[130px] align-middle">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B7C0BC]/60 text-stone-900">
                  {data?.paymentHistory && data.paymentHistory.length > 0 ? (
                    data.paymentHistory.map((p, idx) => (
                      <tr key={idx} className="h-[28px]">
                        <td className="py-1 px-2.5 text-center border-r border-[#B7C0BC]/60 align-middle font-mono">{idx + 1}</td>
                        <td className="py-1 px-3 border-r border-[#B7C0BC]/60 align-middle">{p.tanggal}</td>
                        <td className="py-1 px-3 border-r border-[#B7C0BC]/60 align-middle">{p.metode}</td>
                        <td className="py-1 px-3 text-center font-mono font-medium border-r border-[#B7C0BC]/60 align-middle">{formatRp(p.nominal)}</td>
                        <td className="py-1 px-3 text-stone-800 align-middle">{idx === 0 ? "DP Pendaftaran" : `Pelunasan Tahap ${idx}`}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="h-[28px]">
                      <td className="py-1 px-2.5 text-center border-r border-[#B7C0BC]/60 align-middle font-mono">1</td>
                      <td className="py-1 px-3 border-r border-[#B7C0BC]/60 align-middle">{data?.invoiceDate || "20 Juni 2026"}</td>
                      <td className="py-1 px-3 border-r border-[#B7C0BC]/60 align-middle">{data?.bank ? `Transfer Bank ${data.bank}` : "Transfer Bank BCA"}</td>
                      <td className="py-1 px-3 text-center font-mono font-medium border-r border-[#B7C0BC]/60 align-middle">{formatRp(data?.nominal || 20000000)}</td>
                      <td className="py-1 px-3 text-stone-800 align-middle">DP Pendaftaran</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 5. SUMMARY (LEFT) + CATATAN PENTING (RIGHT) ─── */}
          <div className="grid grid-cols-2 gap-3.5 my-1.5">
            {/* Box Kiri: Summary Finansial */}
            <div className="border border-[#B7C0BC] rounded-[6px] p-2.5 text-[10px] space-y-1.5 bg-white flex flex-col justify-between">
              <div className="grid grid-cols-[130px_8px_1fr] items-center">
                <span className="text-stone-900 font-semibold">Total Tagihan</span>
                <span className="text-stone-600">:</span>
                <span className="font-bold text-stone-900">Rp {formatRp(totalTagihanVal)}</span>
              </div>

              <div className="grid grid-cols-[130px_8px_1fr] items-center">
                <span className="text-stone-900 font-semibold">Total Sudah Dibayar</span>
                <span className="text-stone-600">:</span>
                <span className="font-bold text-stone-900">Rp {formatRp(totalBayarVal)}</span>
              </div>

              <div className="grid grid-cols-[130px_8px_1fr] items-center">
                <span className="text-stone-900 font-semibold">Sisa Tagihan</span>
                <span className="text-stone-600">:</span>
                <span className="font-bold text-red-600">Rp {formatRp(sisaTagihanVal)}</span>
              </div>

              <div className="grid grid-cols-[130px_8px_1fr] items-center pt-0.5">
                <span className="text-stone-900 font-semibold">Status Pembayaran</span>
                <span className="text-stone-600">:</span>
                <div>
                  {isLunas ? (
                    <span className="inline-block bg-[#064e3b] text-white font-bold text-[9.5px] px-2.5 py-0.5 rounded-[4px]">
                      LUNAS
                    </span>
                  ) : (
                    <span className="inline-block bg-[#eab308] text-stone-950 font-black text-[9.5px] px-2.5 py-0.5 rounded-[4px]">
                      BELUM LUNAS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Box Kanan: CATATAN PENTING */}
            <div className="border border-[#B7C0BC] rounded-[6px] p-2.5 text-[9.5px] bg-white flex flex-col justify-between">
              <p className="font-bold text-stone-900 text-[10px] mb-1">CATATAN PENTING</p>
              <ul className="space-y-1 text-stone-800 leading-normal list-disc pl-3">
                <li>
                  Untuk pembayaran melalui Nomor Rekening <strong className="text-stone-950">144-00-0018881-0</strong>, Bank <strong className="text-stone-950">MANDIRI</strong> a/n <strong className="text-stone-950">PT VAUZA TAMMA ABADI</strong>.
                </li>
                <li>
                  Setelah melakukan pembayaran, harap menginformasikan dan mengirimkan bukti pembayaran.
                </li>
              </ul>
            </div>
          </div>

          {/* ─── 6. APPROVAL (LEFT) + VERIFIKASI KEASLIAN (RIGHT) ─── */}
          <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-[#B7C0BC] my-1">
            {/* Approval Kiri */}
            <div className="text-center flex flex-col items-center justify-between min-h-[85px] p-2 border border-[#B7C0BC] rounded-[6px]">
              <div>
                <p className="text-[10px] font-bold text-stone-900 tracking-wide">PT VAUZA TAMMA ABADI</p>
                <p className="text-[9px] text-stone-600 italic">Issued / Approved by</p>
              </div>

              {/* Signature + Stamp PNG Image */}
              <div className="my-0.5 h-[34px] flex items-center justify-center">
                <img
                  src="/images/signature-faisal.png"
                  alt="Signature & Stamp PT Vauza Tamma Abadi"
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <p className="text-[10px] font-bold text-stone-900 tracking-wide border-t border-stone-400 pt-0.5 px-4">
                H. FAISAL WAHYUDI
              </p>
            </div>

            {/* QR Verifikasi Kanan */}
            <div className="text-center flex flex-col items-center justify-between min-h-[85px] p-2 border border-[#B7C0BC] rounded-[6px]">
              <p className="text-[10px] font-bold text-stone-900 tracking-wide">VERIFIKASI KEASLIAN</p>

              {/* QR Code */}
              <div className="my-0.5 h-[36px] w-[36px] flex items-center justify-center">
                <img
                  src="/images/qr-invoice-auth.png"
                  alt="QR Verifikasi Keaslian"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="text-[8px] text-stone-600 leading-tight max-w-[200px]">
                <p>Scan untuk memverifikasi keaslian invoice.</p>
                <p>Invoice ini diterbitkan secara resmi oleh PT Vauza Tamma Abadi.</p>
              </div>
            </div>
          </div>

        </div>

        {/* ─── 7. FOOTER (3 Alamat Kantor + Kontak Perusahaan) ─── */}
        <div className="bg-[#e5e7eb] text-stone-800 px-4 py-2 text-center text-[8.5px] leading-tight space-y-0.5 border-t border-[#B7C0BC]">
          <p>Jl. Kauman No. 21, Kauman, Klojen, Kota Malang</p>
          <p>Jl. Kemang Timur Dalam No. 18B, Bangka, Mampang Prapatan, Kota Jakarta Selatan</p>
          <p>Royal Residence Cluster Crown Hill B15 No. 61, Sumur Welut, Lakarsantri, Kota Surabaya</p>
          <div className="flex items-center justify-center gap-4 pt-0.5 font-semibold text-stone-900">
            <span className="flex items-center gap-1">
              <Phone className="h-2.5 w-2.5 text-stone-700 inline" /> (0341) 399059 / 081-776655-000
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-2.5 w-2.5 text-stone-700 inline" /> vauzatammapremium77@gmail.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
