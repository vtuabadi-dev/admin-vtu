"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartHandshake, Send, User, Upload, Building2, Truck, FileCheck, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

export default function BadalUmrohRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paketOptions, setPaketOptions] = useState<any[]>([]);

  // State Pilihan Status Kejamaahan
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);

  // State Form Simplified
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaPemohon: "",
    nomorWhatsapp: "",
    namaAlmarhum: "",
    jenisKelamin: "L", // "L" | "P"
    metodeSouvenir: "dikantor", // "dikantor" | "dikirim"
    alamatPengiriman: "",
  });

  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);
  const [buktiTransferPreview, setBuktiTransferPreview] = useState<string>("");

  // Fetch Daftar Paket Umroh untuk pilihan Jamaah Vauza
  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson.success && Array.isArray(resJson.data)) {
          setPaketOptions(resJson.data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file bukti transfer maksimal 5MB");
      return;
    }

    setBuktiTransferFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setBuktiTransferPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setBuktiTransferFile(null);
    setBuktiTransferPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isJamaahVauza && !formData.namaPaketUmroh.trim()) {
      alert("Mohon pilih paket umroh yang dijalani");
      return;
    }

    if (formData.metodeSouvenir === "dikirim" && !formData.alamatPengiriman.trim()) {
      alert("Mohon lengkapi alamat pengiriman souvenir");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        isJamaahVauza,
        namaPaketUmroh: isJamaahVauza ? formData.namaPaketUmroh : null,
        namaPemohon: formData.namaPemohon,
        nomorWhatsapp: formData.nomorWhatsapp,
        namaAlmarhum: formData.namaAlmarhum,
        jenisKelamin: formData.jenisKelamin,
        metodeSouvenir: formData.metodeSouvenir,
        alamatPengiriman: formData.metodeSouvenir === "dikirim" ? formData.alamatPengiriman : null,
        buktiTransferUrl: buktiTransferPreview || null,
      };

      const res = await fetch("/api/badal-umroh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setSubmitted(true);
      } else {
        alert(`Gagal menyimpan: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengirim pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({
      namaPaketUmroh: "",
      namaPemohon: "",
      nomorWhatsapp: "",
      namaAlmarhum: "",
      jenisKelamin: "L",
      metodeSouvenir: "dikantor",
      alamatPengiriman: "",
    });
    setBuktiTransferFile(null);
    setBuktiTransferPreview("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Portal Utama / Login
        </Link>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-emerald-600 text-white p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <HeartHandshake className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">Portal Pendaftaran Badal Umroh</CardTitle>
            <p className="text-emerald-100 text-xs mt-1">
              Layanan Pendaftaran Badal Umroh Resmi & Terpercaya dengan Dokumentasi Sertifikat & Rekaman Pelaksanaan di Makkah.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {submitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pendaftaran Badal Umroh Berhasil!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Terima kasih Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPemohon}</span>. Permohonan Badal Umroh untuk <span className="font-semibold text-emerald-600">{formData.namaAlmarhum}</span> telah kami terima.
                </p>

                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-2 border">
                  <p><strong>Status Kejamaahan:</strong> {isJamaahVauza ? "Jamaah Vauza Tiga Utama (VTU)" : "Pendaftaran Umum"}</p>
                  {isJamaahVauza && <p><strong>Paket Umroh:</strong> {formData.namaPaketUmroh || "-"}</p>}
                  <p><strong>Nama Pemohon:</strong> {formData.namaPemohon}</p>
                  <p><strong>Nomor WhatsApp:</strong> {formData.nomorWhatsapp}</p>
                  <p><strong>Nama Almarhum/ah:</strong> {formData.namaAlmarhum} ({formData.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"})</p>
                  <p><strong>Penyerahan Souvenir:</strong> {formData.metodeSouvenir === "dikirim" ? `Dikirim via Ekspedisi (${formData.alamatPengiriman})` : "Diambil di Kantor VTU"}</p>
                  <p><strong>Status Bukti Pembayaran:</strong> {buktiTransferPreview ? "Terunggah (Menunggu Konfirmasi)" : "Belum Diunggah"}</p>
                </div>

                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya mendaftar Badal Umroh atas nama Almarhum/ah: ${formData.namaAlmarhum} (Pemohon: ${formData.namaPemohon}, WA: ${formData.nomorWhatsapp}${isJamaahVauza ? `, Paket: ${formData.namaPaketUmroh}` : ""}). Mohon konfirmasinya.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" /> Konfirmasi via WhatsApp
                  </a>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Daftar Lagi
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* ── 1. Status Kejamaahan ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    1. Apakah Anda Termasuk Jamaah Vauza Tiga Utama (VTU)?
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsJamaahVauza(true)}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        isJamaahVauza
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isJamaahVauza ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Ya, Saya Jamaah Vauza</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Sedang atau akan mengikuti perjalanan Umroh bersama Vauza.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsJamaahVauza(false);
                        setFormData((p) => ({ ...p, namaPaketUmroh: "" }));
                      }}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        !isJamaahVauza
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${!isJamaahVauza ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Bukan (Pendaftaran Umum)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Mendaftarkan Badal Umroh secara umum tanpa terikat paket jamaah.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Jika Jamaah Vauza: Tampilkan pilihan paket umroh */}
                  {isJamaahVauza && (
                    <div className="space-y-1 pt-2 animate-in fade-in-0 duration-200">
                      <label className="font-semibold text-foreground block">
                        Pilih Paket Umroh yang Dijalani <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.namaPaketUmroh}
                        onChange={(e) => setFormData((p) => ({ ...p, namaPaketUmroh: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">-- Pilih Paket Umroh --</option>
                        {paketOptions.length > 0 ? (
                          paketOptions.map((pkt) => (
                            <option key={pkt.id} value={pkt.namaPaket}>
                              {pkt.namaPaket} ({pkt.durasiHari || 9} Hari)
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Paket Umroh Reguler 9 Hari">Paket Umroh Reguler 9 Hari</option>
                            <option value="Paket Umroh VIP 12 Hari">Paket Umroh VIP 12 Hari</option>
                            <option value="Paket Umroh Ramadhan">Paket Umroh Ramadhan</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* ── 2. Data Pemohon ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-emerald-600" />
                    2. Data Pemohon / Yang Mengajukan
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">
                        Nama Yang Mengajukan <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.namaPemohon}
                        onChange={(e) => setFormData((p) => ({ ...p, namaPemohon: e.target.value }))}
                        placeholder="Nama lengkap pemohon..."
                        className="text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">
                        Nomor WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.nomorWhatsapp}
                        onChange={(e) => setFormData((p) => ({ ...p, nomorWhatsapp: e.target.value }))}
                        placeholder="Contoh: 081234567890"
                        className="text-xs h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 3. Data Almarhum / Almarhumah ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <HeartHandshake className="h-4 w-4 text-emerald-600" />
                    3. Data Almarhum / Almarhumah
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">
                        Nama Almarhum / Almarhumah <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.namaAlmarhum}
                        onChange={(e) => setFormData((p) => ({ ...p, namaAlmarhum: e.target.value }))}
                        placeholder="Fulan bin Fulan / Fulanah binti Fulan"
                        className="text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">
                        Jenis Kelamin Almarhum/ah <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, jenisKelamin: "L" }))}
                          className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            formData.jenisKelamin === "L"
                              ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <span>👨 Laki-laki</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, jenisKelamin: "P" }))}
                          className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            formData.jenisKelamin === "P"
                              ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-bold"
                              : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <span>👩 Perempuan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 4. Penyerahan Souvenir ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    4. Penyerahan / Pengambilan Souvenir & Sertifikat
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, metodeSouvenir: "dikantor" }))}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        formData.metodeSouvenir === "dikantor"
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${formData.metodeSouvenir === "dikantor" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Diambil di Kantor VTU</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Diambil langsung di Kantor Operasional Vauza Tiga Utama.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, metodeSouvenir: "dikirim" }))}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        formData.metodeSouvenir === "dikirim"
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${formData.metodeSouvenir === "dikirim" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Dikirim melalui Pengiriman</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Sertifikat & souvenir dikirimkan langsung ke alamat Anda.
                        </p>
                      </div>
                    </button>
                  </div>

                  {formData.metodeSouvenir === "dikirim" && (
                    <div className="space-y-1 pt-1 animate-in fade-in-0 duration-200">
                      <label className="font-semibold text-foreground block">
                        Alamat Lengkap Pengiriman <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formData.alamatPengiriman}
                        onChange={(e) => setFormData((p) => ({ ...p, alamatPengiriman: e.target.value }))}
                        placeholder="Tuliskan alamat lengkap pengiriman (Nama Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos)..."
                        className="w-full p-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>

                {/* ── 5. Upload Bukti Transfer ── */}
                <div className="space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    5. Upload Bukti Transfer / Pembayaran
                  </span>

                  <div className="p-4 border rounded-lg bg-card space-y-3">
                    {buktiTransferPreview ? (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={buktiTransferPreview} alt="Bukti Transfer" className="h-16 w-16 object-cover rounded-md border shadow-xs" />
                        <div className="flex-1 truncate">
                          <p className="font-semibold text-xs text-emerald-950 truncate">{buktiTransferFile?.name || "Bukti Transfer"}</p>
                          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                            {(buktiTransferFile?.size ? (buktiTransferFile.size / 1024).toFixed(0) : "0")} KB — Siap diunggah
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors font-bold text-xs"
                          title="Hapus Bukti Transfer"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-emerald-500 rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all select-none">
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <span className="text-xs font-semibold text-foreground">Klik untuk Unggah Bukti Transfer</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Format: JPG, PNG, WEBP (Maksimal 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* ── Submit Action Bar ── */}
                <div className="pt-4 flex justify-end gap-2 border-t">
                  <Link href="/login">
                    <Button variant="outline" type="button">Batal</Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                    {isSubmitting ? "Mengirim Pendaftaran..." : "Kirim Pendaftaran Badal Umroh"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
