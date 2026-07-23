"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, BookOpen, Send, Heart, UserCheck, Users, Plus, Trash2, Minus, Sparkles, User } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

export default function WakafQuranRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paketOptions, setPaketOptions] = useState<any[]>([]);

  // State Pilihan Status Kejamaahan
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);

  // State Multi-Niat (Tanda Tambah +)
  const [niatList, setNiatList] = useState<string[]>([""]);

  // State Form Utama
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaTourLeader: "",
    namaMuthowif: "",
    namaPeserta: "",
    namaPewakaf: "",
    nomorWhatsapp: "",
    emailPewakaf: "",
    jumlahMushaf: 5, // Angka saja
    lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
    catatan: "",
  });

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

  const handleAddNiat = () => {
    setNiatList((prev) => [...prev, ""]);
  };

  const handleRemoveNiat = (index: number) => {
    setNiatList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNiatChange = (index: number, value: string) => {
    setNiatList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const payload = {
        isJamaahVauza,
        namaPaketUmroh: isJamaahVauza ? formData.namaPaketUmroh : null,
        namaTourLeader: isJamaahVauza ? formData.namaTourLeader : null,
        namaMuthowif: isJamaahVauza ? formData.namaMuthowif : null,
        namaPeserta: isJamaahVauza ? formData.namaPeserta : null,
        namaPewakaf: isJamaahVauza ? (formData.namaPeserta || formData.namaPewakaf) : formData.namaPewakaf,
        nomorWhatsapp: formData.nomorWhatsapp,
        emailPewakaf: formData.emailPewakaf,
        jumlahMushaf: formData.jumlahMushaf,
        lokasiWakaf: formData.lokasiWakaf,
        niatAtasNama: niatList.filter((n) => n.trim() !== "").join(", "),
        catatan: formData.catatan,
      };

      const res = await fetch("/api/wakaf-quran", {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Portal Utama / Login
        </Link>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-sky-600 text-white p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">Portal Pendaftaran Wakaf Al-Qur&apos;an</CardTitle>
            <p className="text-sky-100 text-xs mt-1">
              Program Penyaluran Wakaf Mushaf Al-Qur&apos;an di Masjidil Haram Makkah & Masjid Nabawi Madinah.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pendaftaran Wakaf Qur&apos;an Berhasil!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Jazakallah Khair Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPeserta || formData.namaPewakaf}</span>. Pendaftaran wakaf sebanyak <span className="font-semibold text-sky-600">{formData.jumlahMushaf} Mushaf</span> telah kami terima.
                </p>
                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-1.5">
                  <p><strong>Status Kejamaahan:</strong> {isJamaahVauza ? "Jamaah Vauza Tiga Utama (VTU)" : "Pendaftaran Umum"}</p>
                  {isJamaahVauza && (
                    <>
                      <p><strong>Paket Umroh:</strong> {formData.namaPaketUmroh || "-"}</p>
                      <p><strong>Tour Leader / Muthowif:</strong> {formData.namaTourLeader || "-"} / {formData.namaMuthowif || "-"}</p>
                      <p><strong>Nama Peserta (Pewakaf):</strong> {formData.namaPeserta}</p>
                    </>
                  )}
                  <p><strong>Jumlah Mushaf:</strong> {formData.jumlahMushaf} Mushaf</p>
                  <p><strong>Niat Atas Nama:</strong> {niatList.filter(Boolean).join(", ") || "-"}</p>
                  <p><strong>Lokasi Penyaluran:</strong> {formData.lokasiWakaf}</p>
                </div>
                <div className="pt-4 flex justify-center gap-3">
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya ingin konfirmasi pendaftaran Wakaf Qur'an atas nama: ${formData.namaPeserta || formData.namaPewakaf} (${formData.jumlahMushaf} Mushaf)`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs rounded-lg transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Konfirmasi & Instruksi Transfer via WA
                  </a>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                    Daftar Lagi
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* ── Langkah 1: Pilihan Apakah Termasuk Jamaah Vauza ── */}
                <div className="space-y-3 pb-4 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    1. Apakah Pewakaf Termasuk Jamaah Vauza Tiga Utama (VTU)?
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsJamaahVauza(true)}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        isJamaahVauza
                          ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-2 ring-sky-600/30"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isJamaahVauza ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Ya, Saya Jamaah Vauza</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Sedang atau akan mengikuti perjalanan Umroh bersama Vauza Tiga Utama.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsJamaahVauza(false)}
                      className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                        !isJamaahVauza
                          ? "border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-2 ring-sky-600/30"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${!isJamaahVauza ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Bukan (Pendaftaran Umum)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Mendaftarkan Wakaf Al-Qur&apos;an secara umum tanpa terikat klaster paket.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Langkah 2: Detail Data Pewakaf / Klaster Jamaah ── */}
                {isJamaahVauza ? (
                  <div className="space-y-3 pb-4 border-b bg-sky-50/30 dark:bg-sky-950/10 p-4 rounded-lg border border-sky-100 dark:border-sky-900">
                    <span className="font-bold text-xs uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      2. Data Paket Umroh & Rombongan Klaster Jamaah Vauza
                    </span>

                    {/* A. Pilih Paket Umroh */}
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">A. Pilih Paket Umroh yang Dijalani</label>
                      <select
                        required
                        value={formData.namaPaketUmroh}
                        onChange={(e) => setFormData((p) => ({ ...p, namaPaketUmroh: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Pilih Paket Umroh --</option>
                        {paketOptions.length > 0 ? (
                          paketOptions.map((pkt) => (
                            <option key={pkt.id} value={pkt.namaPaket}>
                              {pkt.namaPaket} ({pkt.durasiHari} Hari)
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

                    {/* B. Tour Leader & Muthowif */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">B1. Nama Tour Leader (TL)</label>
                        <Input
                          type="text"
                          required
                          value={formData.namaTourLeader}
                          onChange={(e) => setFormData((p) => ({ ...p, namaTourLeader: e.target.value }))}
                          placeholder="Masukkan nama Tour Leader..."
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">B2. Nama Muthowif Pembimbing</label>
                        <Input
                          type="text"
                          required
                          value={formData.namaMuthowif}
                          onChange={(e) => setFormData((p) => ({ ...p, namaMuthowif: e.target.value }))}
                          placeholder="Masukkan nama Muthowif..."
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* C. Nama Peserta (Pewakaf) & Nomor WA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">C. Nama Peserta (Pewakaf)</label>
                        <Input
                          type="text"
                          required
                          value={formData.namaPeserta}
                          onChange={(e) => setFormData((p) => ({ ...p, namaPeserta: e.target.value, namaPewakaf: e.target.value }))}
                          placeholder="Nama lengkap peserta jamaah..."
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">Nomor WhatsApp Jamaah (Diisi Sendiri)</label>
                        <Input
                          type="tel"
                          required
                          value={formData.nomorWhatsapp}
                          onChange={(e) => setFormData((p) => ({ ...p, nomorWhatsapp: e.target.value }))}
                          placeholder="0812xxxxxxx"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4 border-b">
                    <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      2. Data Pewakaf (Pendaftaran Umum)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">Nama Lengkap Pewakaf</label>
                        <Input
                          type="text"
                          required
                          value={formData.namaPewakaf}
                          onChange={(e) => setFormData((p) => ({ ...p, namaPewakaf: e.target.value }))}
                          placeholder="H. Ahmad & Keluarga"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">Nomor WhatsApp / Telepon</label>
                        <Input
                          type="tel"
                          required
                          value={formData.nomorWhatsapp}
                          onChange={(e) => setFormData((p) => ({ ...p, nomorWhatsapp: e.target.value }))}
                          placeholder="0812xxxxxxx"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Langkah 3: Multi-Niat Atas Nama (Dengan Tanda Tambah +) ── */}
                <div className="space-y-3 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-sky-600" /> 3. Niat Atas Nama (Opsional Multi-Nama)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNiat}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Nama Niat
                    </button>
                  </div>

                  <div className="space-y-2">
                    {niatList.map((niat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={niat}
                          onChange={(e) => handleNiatChange(idx, e.target.value)}
                          placeholder={`Niat ${idx + 1}: Misal Untuk Almarhum Fulan / Keluarga...`}
                          className="text-xs flex-1"
                        />
                        {niatList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNiat(idx)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Hapus Nama Niat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Langkah 4: Rincian Wakaf Al-Qur'an (Quantity Angka Saja) ── */}
                <div className="space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-sky-600 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-sky-600" /> 4. Rincian Jumlah & Lokasi Wakaf
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantity Counter (Angka Saja) */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-foreground">Jumlah Mushaf (Angka Saja)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, jumlahMushaf: Math.max(1, p.jumlahMushaf - 1) }))}
                          className="h-9 w-9 rounded-md border border-input bg-card hover:bg-muted flex items-center justify-center font-bold text-sm"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={formData.jumlahMushaf}
                          onChange={(e) => setFormData((p) => ({ ...p, jumlahMushaf: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                          className="text-center font-bold text-sm h-9"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, jumlahMushaf: p.jumlahMushaf + 1 }))}
                          className="h-9 w-9 rounded-md border border-input bg-card hover:bg-muted flex items-center justify-center font-bold text-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-medium text-foreground">Lokasi Penyaluran Utama</label>
                      <select
                        value={formData.lokasiWakaf}
                        onChange={(e) => setFormData((p) => ({ ...p, lokasiWakaf: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="Masjidil Haram Makkah Al-Mukarramah">Masjidil Haram Makkah Al-Mukarramah</option>
                        <option value="Masjid Nabawi Madinah Al-Munawwarah">Masjid Nabawi Madinah Al-Munawwarah</option>
                        <option value="Pesantren & Masjid Pelosok">Pesantren & Masjid Pelosok Nusantara</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="font-medium text-foreground">Catatan Khusus (Opsional)</label>
                    <textarea
                      rows={3}
                      value={formData.catatan}
                      onChange={(e) => setFormData((p) => ({ ...p, catatan: e.target.value }))}
                      placeholder="Pesan atau hajat khusus..."
                      className="w-full p-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t">
                  <Link href="/login">
                    <Button variant="outline" type="button">Batal</Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                    {isSubmitting ? "Kirim Pendaftaran..." : "Kirim Pendaftaran Wakaf Qur'an"}
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
