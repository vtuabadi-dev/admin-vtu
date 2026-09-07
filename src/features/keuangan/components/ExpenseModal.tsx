import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Upload,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  Eye,
  ExternalLink,
  FileText,
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
  const [invoiceDriveUrl, setInvoiceDriveUrl] = useState<string | undefined>(
    expenseToEdit?.invoiceDriveUrl
  );
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isDraggingInvoice, setIsDraggingInvoice] = useState(false);

  const [transferProofImage, setTransferProofImage] = useState<string | undefined>(
    expenseToEdit?.transferProofImage
  );
  const [transferProofFileName, setTransferProofFileName] = useState<string | undefined>(
    expenseToEdit?.transferProofFileName
  );
  const [transferProofDriveUrl, setTransferProofDriveUrl] = useState<string | undefined>(
    expenseToEdit?.transferProofDriveUrl
  );
  const [isUploadingTransferProof, setIsUploadingTransferProof] = useState(false);
  const [isDraggingTransfer, setIsDraggingTransfer] = useState(false);

  const [notes, setNotes] = useState(expenseToEdit?.notes || '');

  // AI Scanner state
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // File Review Lightbox state
  const [previewDoc, setPreviewDoc] = useState<{
    url?: string;
    title: string;
    fileName?: string;
    driveUrl?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSarChange = (valSar: number) => {
    setSarValue(valSar);
    setAmount(Math.round(valSar * SAR_TO_IDR));
  };

  // Helper upload file directly to Google Drive Hierarchy
  const uploadFileToGoogleDrive = async (file: File, docType: 'invoice' | 'transfer_proof') => {
    const isInvoice = docType === 'invoice';
    try {
      if (isInvoice) setIsUploadingInvoice(true);
      else setIsUploadingTransferProof(true);

      const linkedGroup = groups.find((g) => g.id === groupId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('category', category || 'Operasional');
      if (linkedGroup?.departureDate) {
        formData.append('departureDate', linkedGroup.departureDate);
      }
      if (linkedGroup?.name) {
        formData.append('packageName', linkedGroup.name);
      }
      formData.append('transactionDate', transactionDate || new Date().toISOString().slice(0, 10));

      const res = await fetch('/api/admin/keuangan/upload-drive', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (isInvoice) {
          if (json.data.url) setInvoiceDriveUrl(json.data.url);
          if (json.data.fileName) setInvoiceFileName(json.data.fileName);
        } else {
          if (json.data.url) setTransferProofDriveUrl(json.data.url);
          if (json.data.fileName) setTransferProofFileName(json.data.fileName);
        }
      }
    } catch (err) {
      console.warn('[Google Drive Upload Warning]', err);
    } finally {
      if (isInvoice) setIsUploadingInvoice(false);
      else setIsUploadingTransferProof(false);
    }
  };

  // Core file processor (Supports Local Explorer, WhatsApp Desktop/Web, Drag & Drop, Paste)
  const processAndSetFile = (file: File, docType: 'invoice' | 'transfer_proof') => {
    const isInvoice = docType === 'invoice';
    const originalName = file.name || (isInvoice ? 'invoice.jpg' : 'bukti-tf.jpg');

    if (isInvoice) {
      setInvoiceFileName(originalName);
    } else {
      setTransferProofFileName(originalName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isInvoice) {
        setInvoiceImage(result);
      } else {
        setTransferProofImage(result);
      }
    };
    reader.readAsDataURL(file);

    // Auto sync to Google Drive
    uploadFileToGoogleDrive(file, docType);
  };

  const extractFileFromDataTransfer = (dataTransfer: DataTransfer): File | null => {
    // 1. Standard files array (File explorer or dragged from WhatsApp)
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      const f = dataTransfer.files[0];
      if (f) return f;
    }
    // 2. DataTransfer items check (WhatsApp Web / Chrome blobs)
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        if (item && item.kind === 'file') {
          const file = item.getAsFile();
          if (file) return file;
        }
      }
    }
    return null;
  };

  const handleInvoiceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingInvoice(false);
    const file = extractFileFromDataTransfer(e.dataTransfer);
    if (file) {
      processAndSetFile(file, 'invoice');
    }
  };

  const handleTransferDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTransfer(false);
    const file = extractFileFromDataTransfer(e.dataTransfer);
    if (file) {
      processAndSetFile(file, 'transfer_proof');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndSetFile(file, 'invoice');
  };

  const handleTransferProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndSetFile(file, 'transfer_proof');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !vendorName || amount <= 0) {
      alert('Mohon lengkapi judul, nama vendor, dan nominal pengeluaran.');
      return;
    }

    const linkedGroup = groups.find((g) => g.id === groupId);
    let finalInvoiceFileName = invoiceFileName;
    let finalTransferProofFileName = transferProofFileName;

    // Relokasi otomatis dari WAIT LABEL ke folder Paket jika sebelumnya non-paket dan sekarang diikatkan ke paket
    const wasUnlinked = expenseToEdit && (!expenseToEdit.groupId || expenseToEdit.groupId === '');
    const isNowLinked = Boolean(groupId && linkedGroup);

    if (wasUnlinked && isNowLinked && (invoiceDriveUrl || transferProofDriveUrl)) {
      try {
        const relocateRes = await fetch('/api/admin/keuangan/relocate-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceDriveUrl,
            transferProofDriveUrl,
            category,
            departureDate: linkedGroup?.departureDate,
            packageName: linkedGroup?.name,
            transactionDate,
          }),
        });
        const relocateJson = await relocateRes.json();
        if (relocateJson.success && relocateJson.data) {
          if (relocateJson.data.invoiceNewName) finalInvoiceFileName = relocateJson.data.invoiceNewName;
          if (relocateJson.data.transferNewName) finalTransferProofFileName = relocateJson.data.transferNewName;
        }
      } catch (relocateErr) {
        console.warn('[Relocate Drive Warning]', relocateErr);
      }
    }

    const record: ExpenseRecord = {
      id: expenseToEdit?.id || `exp-${Date.now()}`,
      title,
      groupId: groupId || undefined,
      groupName: linkedGroup ? linkedGroup.name : 'WAIT LABEL',
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
      invoiceFileName: finalInvoiceFileName,
      invoiceDriveUrl,
      transferProofImage,
      transferProofFileName: finalTransferProofFileName,
      transferProofDriveUrl,
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">Kaitkan Keberangkatan Grup</label>
                {!groupId ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ⏳ WAIT LABEL
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✓ Terkait Paket
                  </span>
                )}
              </div>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">⏳ WAIT LABEL (Belum Terkait Paket)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
              {!groupId && (
                <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                  <span>ℹ️</span>
                  <span>
                    <strong>Status WAIT LABEL:</strong> Berkas bukti tersimpan di folder <code>WAIT LABEL</code> Google Drive dan dapat dikaitkan ke paket keberangkatan kapan saja.
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori Pengeluaran</label>
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

          {/* File Attachments Grid (Bukti Invoice & Bukti Transfer) with WhatsApp Drag & Drop & Checkmark UI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Bukti Invoice / Tagihan */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-500" /> Bukti Invoice / Tagihan
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

              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageUpload}
                id="invoice-upload-file"
                className="hidden"
              />

              {/* Dropzone Container */}
              {invoiceImage || invoiceFileName ? (
                /* Tampilan Kolom Tanda Cawang (Centang Hijau) Ketika File Sudah Masuk */
                <div className="p-2.5 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 bg-emerald-500/20 text-emerald-600 rounded-full shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate" title={invoiceFileName}>
                        {invoiceFileName || 'Invoice Terlampir'}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        {isUploadingInvoice ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                            <span className="text-amber-700 font-bold">Sinkronisasi ke Drive...</span>
                          </>
                        ) : invoiceDriveUrl ? (
                          '✓ Tersimpan di Google Drive'
                        ) : (
                          '✓ File Bukti Invoice Siap'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDoc({
                          url: invoiceImage,
                          title: 'Bukti Invoice / Tagihan',
                          fileName: invoiceFileName,
                          driveUrl: invoiceDriveUrl,
                        })
                      }
                      className="p-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded transition-colors shadow-2xs flex items-center gap-1 text-[10px] font-bold"
                      title="Lihat / Review File Invoice"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat</span>
                    </button>
                    <label
                      htmlFor="invoice-upload-file"
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded cursor-pointer transition-colors shadow-2xs"
                    >
                      Ganti
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceImage(undefined);
                        setInvoiceFileName(undefined);
                        setInvoiceDriveUrl(undefined);
                      }}
                      className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                      title="Hapus file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Dropzone Kosong: Drag & Drop (Supports WA & Local Files) */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingInvoice(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingInvoice(false);
                  }}
                  onDrop={handleInvoiceDrop}
                  onPaste={(e) => {
                    const file = e.clipboardData.files?.[0];
                    if (file) {
                      processAndSetFile(file, 'invoice');
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer ${
                    isDraggingInvoice
                      ? 'border-amber-500 bg-amber-500/15 scale-[1.01]'
                      : 'border-slate-300 hover:border-amber-500 bg-white hover:bg-amber-50/30'
                  }`}
                  onClick={() => document.getElementById('invoice-upload-file')?.click()}
                >
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <Upload className={`w-5 h-5 ${isDraggingInvoice ? 'text-amber-600 animate-bounce' : 'text-slate-400'}`} />
                    <p className="text-[11px] font-semibold text-slate-700">
                      Tarik &amp; lepas file (bisa dari WA)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      atau <span className="text-amber-600 font-bold underline">klik untuk upload</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Bukti Transfer (Bukti TF) */}
            <div className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bukti Transfer (Bukti TF)
                </label>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleTransferProofUpload}
                id="transfer-proof-upload-file"
                className="hidden"
              />

              {/* Dropzone Container */}
              {transferProofImage || transferProofFileName ? (
                /* Tampilan Kolom Tanda Cawang (Centang Hijau) Ketika File Sudah Masuk */
                <div className="p-2.5 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 bg-emerald-500/20 text-emerald-600 rounded-full shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate" title={transferProofFileName}>
                        {transferProofFileName || 'Bukti TF Terlampir'}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        {isUploadingTransferProof ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                            <span className="text-amber-700 font-bold">Sinkronisasi ke Drive...</span>
                          </>
                        ) : transferProofDriveUrl ? (
                          '✓ Tersimpan di Google Drive'
                        ) : (
                          '✓ File Bukti TF Siap'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDoc({
                          url: transferProofImage,
                          title: 'Bukti Transfer (TF)',
                          fileName: transferProofFileName,
                          driveUrl: transferProofDriveUrl,
                        })
                      }
                      className="p-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded transition-colors shadow-2xs flex items-center gap-1 text-[10px] font-bold"
                      title="Lihat / Review File Bukti TF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat</span>
                    </button>
                    <label
                      htmlFor="transfer-proof-upload-file"
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded cursor-pointer transition-colors shadow-2xs"
                    >
                      Ganti
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferProofImage(undefined);
                        setTransferProofFileName(undefined);
                        setTransferProofDriveUrl(undefined);
                      }}
                      className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                      title="Hapus file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Dropzone Kosong: Drag & Drop (Supports WA & Local Files) */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingTransfer(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingTransfer(false);
                  }}
                  onDrop={handleTransferDrop}
                  onPaste={(e) => {
                    const file = e.clipboardData.files?.[0];
                    if (file) {
                      processAndSetFile(file, 'transfer_proof');
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer ${
                    isDraggingTransfer
                      ? 'border-emerald-500 bg-emerald-500/15 scale-[1.01]'
                      : 'border-amber-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/30'
                  }`}
                  onClick={() => document.getElementById('transfer-proof-upload-file')?.click()}
                >
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <Upload className={`w-5 h-5 ${isDraggingTransfer ? 'text-emerald-600 animate-bounce' : 'text-slate-400'}`} />
                    <p className="text-[11px] font-semibold text-slate-700">
                      Tarik &amp; lepas file (bisa dari WA)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      atau <span className="text-amber-600 font-bold underline">klik untuk upload</span>
                    </p>
                  </div>
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

      {/* Modal Lightbox Review File Terupload */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header Review */}
            <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-amber-400 truncate">{previewDoc.title}</h4>
                <p className="text-[11px] text-slate-300 truncate">{previewDoc.fileName || 'Review Dokumen Terlampir'}</p>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.driveUrl && (
                  <a
                    href={previewDoc.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Review Preview */}
            <div className="p-4 overflow-auto flex-1 bg-slate-950 flex items-center justify-center min-h-[300px]">
              {previewDoc.url ? (
                previewDoc.url.startsWith('data:application/pdf') ? (
                  <iframe
                    src={previewDoc.url}
                    className="w-full h-[60vh] rounded border border-slate-800"
                    title="Review PDF"
                  />
                ) : (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-800 shadow-xl"
                  />
                )
              ) : (
                <div className="text-center text-slate-400 p-8 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-xs">Preview visual file tidak tersedia.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
