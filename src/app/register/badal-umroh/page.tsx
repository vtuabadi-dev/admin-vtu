"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartHandshake, Send } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

export default function BadalUmrohRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    namaPemohon: "",
    nomorWhatsapp: "",
    emailPemohon: "",
    namaAlmarhum: "",
    jenisKelamin: "L",
    hubungan: "Orang Tua",
    paketBadal: "Standard (Dokumentasi Sertifikat & Video Execution)",
    catatan: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
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
                  Terima kasih Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPemohon}</span>. Permohonan Badal Umroh untuk <span className="font-semibold text-emerald-600">{formData.namaAlmarhum}</span> telah kami terima.
                </p>
                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-1.5">
                  <p><strong>Nama Almarhum/ah:</strong> {formData.namaAlmarhum}</p>
                  <p><strong>Hubungan:</strong> {formData.hubungan}</p>
                  <p><strong>Paket:</strong> {formData.paketBadal}</p>
                  <p><strong>Status:</strong> Menunggu Konfirmasi Tim Operasional</p>
                </div>
                <div className="pt-4 flex justify-center gap-3">
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya ingin konfirmasi pendaftaran Badal Umroh atas nama Almarhum/ah: ${formData.namaAlmarhum}`)}`}
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
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-3 pb-3 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 block">
                    1. Data Pemohon / Penanggung Jawab
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                <div className="space-y-3 pt-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 block">
                    2. Data Almarhum / Almarhumah yang Dibadalkan
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <option value="Standard">Badal Umroh Standard + Sertifikat & Video Execution</option>
                        <option value="VIP">Badal Umroh VIP + Sertifikat Cetak & Cuplikan Doa Khusus</option>
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
