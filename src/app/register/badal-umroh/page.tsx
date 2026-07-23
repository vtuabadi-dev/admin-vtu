"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartHandshake, Send, UserCheck, Users, Compass, User, Phone, Mail, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

export default function BadalUmrohRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paketOptions, setPaketOptions] = useState<any[]>([]);

  // State Pilihan Status Kejamaahan
  const [isJamaahVauza, setIsJamaahVauza] = useState<boolean>(true);

  // State Form
  const [formData, setFormData] = useState({
    namaPaketUmroh: "",
    namaTourLeader: "",
    namaMuthowif: "",
    namaPeserta: "",
    namaPemohon: "",
    nomorWhatsapp: "",
    emailPemohon: "",
    namaAlmarhum: "",
    jenisKelamin: "L",
    hubungan: "Orang Tua",
    paketBadal: "Standard (Dokumentasi Sertifikat & Video Execution)",
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
        namaPemohon: isJamaahVauza ? (formData.namaPeserta || formData.namaPemohon) : formData.namaPemohon,
        nomorWhatsapp: formData.nomorWhatsapp,
        emailPemohon: formData.emailPemohon,
        namaAlmarhum: formData.namaAlmarhum,
        jenisKelamin: formData.jenisKelamin,
        hubungan: formData.hubungan,
        paketBadal: formData.paketBadal,
        catatan: formData.catatan,
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
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pendaftaran Badal Umroh Berhasil!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Terima kasih Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPeserta || formData.namaPemohon}</span>. Permohonan Badal Umroh untuk <span className="font-semibold text-emerald-600">{formData.namaAlmarhum}</span> telah kami terima.
                </p>
                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-1.5">
                  <p><strong>Status Kejamaahan:</strong> {isJamaahVauza ? "Jamaah Vauza Tiga Utama (VTU)" : "Pendaftaran Umum"}</p>
                  {isJamaahVauza && (
                    <>
                      <p><strong>Paket Umroh:</strong> {formData.namaPaketUmroh || "-"}</p>
                      <p><strong>Tour Leader / Muthowif:</strong> {formData.namaTourLeader || "-"} / {formData.namaMuthowif || "-"}</p>
                      <p><strong>Nama Peserta Jamaah:</strong> {formData.namaPeserta}</p>
                    </>
                  )}
                  <p><strong>Nama Almarhum/ah:</strong> {formData.namaAlmarhum}</p>
                  <p><strong>Hubungan:</strong> {formData.hubungan}</p>
                  <p><strong>Paket Badal:</strong> {formData.paketBadal}</p>
                </div>
                <div className="pt-4 flex justify-center gap-3">
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya ingin konfirmasi pendaftaran Badal Umroh atas nama Almarhum/ah: ${formData.namaAlmarhum} (Pemohon: ${formData.namaPeserta || formData.namaPemohon})`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Konfirmasi via WhatsApp
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
                          ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-600/30"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isJamaahVauza ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
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
                          ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-600/30"
                          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${!isJamaahVauza ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">Bukan (Pendaftaran Umum)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Mendaftarkan Badal Umroh secara umum tanpa terikat klaster paket jamaah.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Langkah 2: Detail Data Pemohon / Klaster Jamaah ── */}
                {isJamaahVauza ? (
                  <div className="space-y-3 pb-4 border-b bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
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

                    {/* C. Nama Peserta (Jamaah) & Kontak */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">C. Nama Peserta (Jamaah)</label>
                        <Input
                          type="text"
                          required
                          value={formData.namaPeserta}
                          onChange={(e) => setFormData((p) => ({ ...p, namaPeserta: e.target.value, namaPemohon: e.target.value }))}
                          placeholder="Nama lengkap peserta jamaah..."
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">Nomor WhatsApp Jamaah</label>
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
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      2. Data Pemohon / Penanggung Jawab (Pendaftaran Umum)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-medium text-foreground">Nama Lengkap Pemohon</label>
                        <Input
                          type="text"
                          required
                          value={formData.namaPemohon}
                          onChange={(e) => setFormData((p) => ({ ...p, namaPemohon: e.target.value }))}
                          placeholder="Masukkan nama Anda..."
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

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Email Pemohon (Opsional)</label>
                      <Input
                        type="email"
                        value={formData.emailPemohon}
                        onChange={(e) => setFormData((p) => ({ ...p, emailPemohon: e.target.value }))}
                        placeholder="nama@email.com"
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ── Langkah 3: Data Almarhum / Almarhumah yang Dibadalkan ── */}
                <div className="space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <Compass className="h-4 w-4" />
                    3. Data Almarhum / Almarhumah yang Dibadalkan
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Nama Almarhum / Almarhumah</label>
                      <Input
                        type="text"
                        required
                        value={formData.namaAlmarhum}
                        onChange={(e) => setFormData((p) => ({ ...p, namaAlmarhum: e.target.value }))}
                        placeholder="Fulan bin Fulan"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Jenis Kelamin Almarhum/ah</label>
                      <select
                        value={formData.jenisKelamin}
                        onChange={(e) => setFormData((p) => ({ ...p, jenisKelamin: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="L">Laki-laki (Almarhum)</option>
                        <option value="P">Perempuan (Almarhumah)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Hubungan Keluarga</label>
                      <select
                        value={formData.hubungan}
                        onChange={(e) => setFormData((p) => ({ ...p, hubungan: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="Ayah / Ibu">Ayah / Ibu</option>
                        <option value="Kakek / Nenek">Kakek / Nenek</option>
                        <option value="Suami / Istri">Suami / Istri</option>
                        <option value="Saudara Kandung">Saudara Kandung</option>
                        <option value="Kerabat Lainnya">Kerabat Lainnya</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Pilihan Paket Badal</label>
                      <select
                        value={formData.paketBadal}
                        onChange={(e) => setFormData((p) => ({ ...p, paketBadal: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value="Standard (Dokumentasi Sertifikat & Video Execution)">Badal Umroh Standard + Sertifikat & Video Execution</option>
                        <option value="VIP (Badal Umroh VIP + Sertifikat Cetak & Cuplikan Doa Khusus)">Badal Umroh VIP + Sertifikat Cetak & Cuplikan Doa Khusus</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Doa Khusus / Catatan Tambahan (Opsional)</label>
                    <textarea
                      rows={3}
                      value={formData.catatan}
                      onChange={(e) => setFormData((p) => ({ ...p, catatan: e.target.value }))}
                      placeholder="Tuliskan doa khusus yang ingin dibacakan saat tawaf/sa'i..."
                      className="w-full p-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t">
                  <Link href="/login">
                    <Button variant="outline" type="button">Batal</Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSubmitting ? "Kirim Pendaftaran..." : "Kirim Pendaftaran Badal Umroh"}
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
