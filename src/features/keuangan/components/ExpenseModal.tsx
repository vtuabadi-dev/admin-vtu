import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Upload,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { DepartureGroup, ExpenseCategory, ExpenseRecord, PaymentStatus } from '../types';
import { SAR_TO_IDR } from '../utils/formatters';
import { loadStoredCategories, saveCustomCategory } from '../utils/storage';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: DepartureGroup[];
  expenseToEdit?: ExpenseRecord | null;
  defaultGroupId?: string;
  onSaveExpense: (expense: ExpenseRecord) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  groups,
  expenseToEdit,
  defaultGroupId,
  onSaveExpense,
}) => {
  const [title, setTitle] = useState(expenseToEdit?.title || '');
  const [groupId, setGroupId] = useState<string>(
    expenseToEdit?.groupId || defaultGroupId || ''
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    expenseToEdit?.category || 'Hotel Makkah'
  );
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setCategoriesList(loadStoredCategories());
  }, []);
  const [vendorName, setVendorName] = useState(expenseToEdit?.vendorName || '');
  const [amount, setAmount] = useState<number>(expenseToEdit?.amount || 0);
  const [currencyMode, setCurrencyMode] = useState<'IDR' | 'SAR'>('IDR');
  const [sarValue, setSarValue] = useState<number>(
    expenseToEdit?.amountSar || (expenseToEdit ? Math.round(expenseToEdit.amount / SAR_TO_IDR) : 0)
  );

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    expenseToEdit?.paymentStatus || 'Lunas'
  );
  const [paidAmount, setPaidAmount] = useState<number>(
    expenseToEdit?.paidAmount || (expenseToEdit?.paymentStatus === 'Lunas' ? expenseToEdit.amount : 0)
  );
  const [paymentDeadline, setPaymentDeadline] = useState<string>(
    expenseToEdit?.paymentDeadline || ''
  );
  const [transactionDate, setTransactionDate] = useState<string>(
    expenseToEdit?.transactionDate || new Date().toISOString().slice(0, 10)
  );
  const [invoiceNumber, setInvoiceNumber] = useState(expenseToEdit?.invoiceNumber || '');
  const [invoiceImage, setInvoiceImage] = useState<string | undefined>(
    expenseToEdit?.invoiceImage
  );
  const [invoiceFileName, setInvoiceFileName] = useState<string | undefined>(
    expenseToEdit?.invoiceFileName
  );
  const [transferProofImage, setTransferProofImage] = useState<string | undefined>(
    expenseToEdit?.transferProofImage
  );
  const [transferProofFileName, setTransferProofFileName] = useState<string | undefined>(
    expenseToEdit?.transferProofFileName
  );
  const [notes, setNotes] = useState(expenseToEdit?.notes || '');

  // AI Scanner state
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSarChange = (valSar: number) => {
    setSarValue(valSar);
    setAmount(Math.round(valSar * SAR_TO_IDR));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInvoiceFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setInvoiceImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleTransferProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTransferProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setTransferProofImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAiScanInvoice = async () => {
    if (!invoiceImage) {
      alert('Silakan upload / pilih foto invoice terlebih dahulu sebelum melakukan scan AI.');
      return;
    }

    try {
      setIsScanningAI(true);
      setScanMessage('Menganalisis invoice dengan AI Studio Gemini...');

      const response = await fetch('/api/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: invoiceImage,
          mimeType: 'image/jpeg',
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;
        if (data.vendor) setVendorName(data.vendor);
        if (data.category) setCategory(data.category as ExpenseCategory);
        if (data.amount && typeof data.amount === 'number') setAmount(data.amount);
        if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
        if (data.description) setTitle(data.description);
        if (data.date) setTransactionDate(data.date);
        if (data.dueDate) setPaymentDeadline(data.dueDate);

        setScanMessage('✨ Data invoice berhasil diekstrak otomatis oleh AI!');
        setTimeout(() => setScanMessage(null), 4000);
      } else {
        alert(result.error || 'Gagal mengekstrak invoice.');
      }
    } catch (err) {
      console.error('Error scanning invoice:', err);
      alert('Terjadi kesalahan saat memproses invoice dengan AI.');
    } finally {
      setIsScanningAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !vendorName || amount <= 0) {
      alert('Mohon lengkapi judul, nama vendor, dan nominal pengeluaran.');
      return;
    }

    const linkedGroup = groups.find((g) => g.id === groupId);

    const record: ExpenseRecord = {
      id: expenseToEdit?.id || `exp-${Date.now()}`,
      title,
      groupId: groupId || undefined,
      groupName: linkedGroup ? linkedGroup.name : 'Operasional Umum',
      category,
      vendorName,
      amount: Number(amount),
      amountSar: sarValue > 0 ? sarValue : undefined,
      paymentStatus,
      paidAmount: paymentStatus === 'Lunas' ? Number(amount) : Number(paidAmount || 0),
      paymentDeadline: paymentDeadline || undefined,
      transactionDate,
      invoiceNumber,
      invoiceImage,
      invoiceFileName,
      transferProofImage,
      transferProofFileName,
      notes,
      createdAt: expenseToEdit?.createdAt || new Date().toISOString().slice(0, 10),
    };

    onSaveExpense(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            {expenseToEdit ? 'Edit Catatan Pengeluaran' : 'Input Pengeluaran / Pembayaran Vendor'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* AI Scan Banner */}
          {scanMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          {/* Group & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kaitkan Keberangkatan Grup</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Operasional Umum (Non-Grup)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">Kategori Pengeluaran</label>
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(true)}
                  className="text-emerald-700 hover:text-emerald-800 hover:underline font-bold text-[11px] flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> + Tambah Kategori
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    setShowAddCatModal(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__ADD_NEW__" className="font-bold text-emerald-700 bg-emerald-50">
                  + Tambah Kategori Baru...
                </option>
              </select>
            </div>
          </div>

          {/* Title & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Keterangan / Item Pembayaran</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Contoh: DP Hotel Anjum Makkah 5 Malam"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Vendor / Supplier / Penerima</label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Contoh: Anjum Hotel Makkah Co."
              />
            </div>
          </div>

          {/* Amount & Currency Conversion */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">Nominal Tagihan / Pembayaran</label>
              <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCurrencyMode('IDR')}
                  className={`px-2 py-0.5 rounded ${
                    currencyMode === 'IDR' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Rupiah (IDR)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode('SAR')}
                  className={`px-2 py-0.5 rounded ${
                    currencyMode === 'SAR' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Riyal (SAR)
                </button>
              </div>
            </div>

            {currencyMode === 'IDR' ? (
              <div>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-base text-emerald-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="25000000"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Nominal SAR (Riyal)</span>
                  <input
                    type="number"
                    min="0"
                    value={sarValue}
                    onChange={(e) => handleSarChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-amber-800 bg-white"
                    placeholder="10000 SAR"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Ekuivalen IDR (Kurs ~4.300)</span>
                  <div className="px-3 py-2 bg-slate-200 rounded-xl font-bold text-slate-800">
                    Rp {amount.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Status & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Status Pembayaran</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Lunas">Lunas</option>
                <option value="DP / Partial">DP / Partial</option>
                <option value="Belum Dibayar">Belum Dibayar</option>
              </select>
            </div>

            {paymentStatus === 'DP / Partial' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jumlah Sudah DP (Rp)</label>
                <input
                  type="number"
                  min="0"
                  max={amount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-emerald-800"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tenggat Pembayaran Vendor
              </label>
              <input
                type="date"
                value={paymentDeadline}
                onChange={(e) => setPaymentDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nomor Invoice / Ref</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
                placeholder="INV/2026/089"
              />
            </div>
          </div>

          {/* File Attachments Grid (Bukti Invoice & Bukti Transfer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Invoice Attachment Upload & AI Scan button */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-500" /> Bukti Invoice / Tagihan
                </label>

                {invoiceImage && (
                  <button
                    type="button"
                    onClick={handleAiScanInvoice}
                    disabled={isScanningAI}
                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] shadow transition-all flex items-center gap-1"
                  >
                    {isScanningAI ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" /> AI Scan
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  id="invoice-upload-file"
                  className="hidden"
                />
                <label
                  htmlFor="invoice-upload-file"
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:border-amber-500 rounded-lg text-slate-700 font-semibold cursor-pointer transition-colors shadow-sm text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{invoiceFileName ? 'Ganti File' : 'Upload Invoice'}</span>
                </label>

                {invoiceFileName && (
                  <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                    {invoiceFileName}
                  </span>
                )}
              </div>

              {/* Preview Thumbnail */}
              {invoiceImage && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300 bg-white group mt-1">
                  <img
                    src={invoiceImage}
                    alt="Preview Invoice"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceImage(undefined);
                      setInvoiceFileName(undefined);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Bukti Transfer (Bukti TF) Upload */}
            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bukti Transfer (Bukti TF)
                </label>
                {transferProofImage && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Terlampir
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTransferProofUpload}
                  id="transfer-proof-upload-file"
                  className="hidden"
                />
                <label
                  htmlFor="transfer-proof-upload-file"
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:border-amber-500 rounded-lg text-slate-800 font-semibold cursor-pointer transition-colors shadow-sm text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>{transferProofFileName ? 'Ganti Bukti TF' : 'Upload Bukti TF'}</span>
                </label>

                {transferProofFileName && (
                  <span className="text-[11px] text-slate-600 truncate max-w-[120px]">
                    {transferProofFileName}
                  </span>
                )}
              </div>

              {/* Preview Thumbnail for Transfer Proof */}
              {transferProofImage && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-emerald-400 bg-slate-900 group mt-1">
                  <img
                    src={transferProofImage}
                    alt="Preview Bukti TF"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTransferProofImage(undefined);
                      setTransferProofFileName(undefined);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
              placeholder="Catatan rekening penerima, nomor transfer, dll."
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-950/30"
            >
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>

      {/* Sub-modal: Tambah Kategori Pengeluaran Baru */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" /> Tambah Kategori Pengeluaran Baru
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Jenis Kategori</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Contoh: Sewa Guide Lokal / Airport Handling"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCategoryName.trim()) {
                    alert('Mohon isi nama kategori baru.');
                    return;
                  }
                  const updated = saveCustomCategory(newCategoryName.trim());
                  setCategoriesList(updated);
                  setCategory(newCategoryName.trim());
                  setNewCategoryName('');
                  setShowAddCatModal(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Simpan &amp; Gunakan Kategori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
