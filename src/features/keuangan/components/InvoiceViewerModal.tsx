import React, { useState, useEffect } from 'react';
import { X, Download, Printer, FileText, CheckCircle2, Image } from 'lucide-react';
import { ExpenseRecord } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';

interface InvoiceViewerModalProps {
  expense: ExpenseRecord | null;
  initialDocType?: 'invoice' | 'transfer';
  onClose: () => void;
}

export const InvoiceViewerModal: React.FC<InvoiceViewerModalProps> = ({
  expense,
  initialDocType = 'invoice',
  onClose,
}) => {
  const [activeDoc, setActiveDoc] = useState<'invoice' | 'transfer'>(initialDocType);

  useEffect(() => {
    if (initialDocType) {
      setActiveDoc(initialDocType);
    } else if (expense) {
      if (expense.transferProofImage && !expense.invoiceImage) {
        setActiveDoc('transfer');
      } else {
        setActiveDoc('invoice');
      }
    }
  }, [expense, initialDocType]);

  if (!expense) return null;

  const currentImage =
    activeDoc === 'transfer' ? expense.transferProofImage : expense.invoiceImage;

  const currentFileName =
    activeDoc === 'transfer'
      ? expense.transferProofFileName || `Bukti_TF_${expense.vendorName}_${expense.transactionDate}.png`
      : expense.invoiceFileName || `Invoice_${expense.vendorName}_${expense.transactionDate}.png`;

  const handlePrint = () => {
    if (!currentImage) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeDoc === 'transfer' ? 'Bukti Transfer (TF)' : 'Bukti Invoice'} - ${expense.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            img { max-width: 100%; height: auto; border: 1px solid #ccc; margin-top: 15px; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${activeDoc === 'transfer' ? 'BUKTI TRANSFER / PEMBAYARAN BANK' : 'BUKTI INVOICE / KWITANSI TAGIHAN'}</h2>
            <p><strong>Vendor:</strong> ${expense.vendorName} | <strong>Nominal:</strong> ${formatRupiah(
      expense.amount
    )}</p>
            <p><strong>Keterangan:</strong> ${expense.title}</p>
          </div>
          <img src="${currentImage}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = currentFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase bg-amber-950 border border-amber-700/50 px-2 py-0.5 rounded">
                DOKUMEN VENDOR
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  expense.paymentStatus === 'Lunas'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                }`}
              >
                {expense.paymentStatus}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">{expense.title}</h3>
            <p className="text-xs text-slate-400">
              Vendor: <strong className="text-white">{expense.vendorName}</strong> | Nominal:{' '}
              <strong className="text-amber-400">{formatRupiah(expense.amount)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!currentImage}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-semibold border border-slate-600 transition-colors flex items-center gap-1.5"
              title="Cetak Dokumen"
            >
              <Printer className="w-4 h-4 text-amber-400" /> Cetak
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={!currentImage}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
              title="Download Gambar"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Bukti Invoice vs Bukti Transfer */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveDoc('invoice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeDoc === 'invoice'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bukti Invoice / Tagihan</span>
            {expense.invoiceImage && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveDoc('transfer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeDoc === 'transfer'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bukti Transfer (TF)</span>
            {expense.transferProofImage && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* Image Container */}
        <div className="p-6 overflow-auto flex-1 bg-slate-950 flex items-center justify-center min-h-[320px]">
          {currentImage ? (
            <img
              src={currentImage}
              alt={activeDoc === 'transfer' ? 'Bukti Transfer' : 'Bukti Invoice'}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl border border-slate-800"
            />
          ) : (
            <div className="text-center text-slate-400 p-8 space-y-2 max-w-sm">
              <Image className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-300">
                {activeDoc === 'transfer'
                  ? 'Belum ada bukti transfer (TF) yang di-upload.'
                  : 'Belum ada bukti invoice yang di-upload.'}
              </p>
              <p className="text-xs text-slate-500">
                {activeDoc === 'transfer'
                  ? 'Anda dapat mengunggah foto / slip resi transfer saat melakukan edit pengeluaran.'
                  : 'Silakan upload foto invoice dari vendor untuk keperluan rekap.'}
              </p>
            </div>
          )}
        </div>

        {/* Invoice / Transfer Meta Detail Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Dokumen Aktif</span>
            <span className="font-semibold text-amber-400">
              {activeDoc === 'transfer' ? 'Bukti Transfer (TF)' : 'Bukti Invoice / Tagihan'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">No. Invoice / Ref</span>
            <span className="font-semibold text-slate-100">{expense.invoiceNumber || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Tanggal Transaksi</span>
            <span className="font-semibold text-slate-100">{formatTanggalIndo(expense.transactionDate)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Status Bayar</span>
            <span
              className={`font-bold ${
                expense.paymentStatus === 'Lunas' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {expense.paymentStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
