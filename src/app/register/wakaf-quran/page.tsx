"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, BookOpen, Send, Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

export default function WakafQuranRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    namaPewakaf: "",
    nomorWhatsapp: "",
    emailPewakaf: "",
    jumlahMushaf: 5,
    lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
    niatAtasNama: "",
    catatan: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/wakaf-quran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
                  Jazakallah Khair Bpk/Ibu <span className="font-semibold text-foreground">{formData.namaPewakaf}</span>. Pendaftaran wakaf sebanyak <span className="font-semibold text-sky-600">{formData.jumlahMushaf} Mushaf</span> telah kami terima.
                </p>
                <div className="bg-muted/40 p-4 rounded-lg text-xs text-left max-w-md mx-auto space-y-1.5">
                  <p><strong>Pewakaf:</strong> {formData.namaPewakaf}</p>
                  <p><strong>Niat Atas Nama:</strong> {formData.niatAtasNama || formData.namaPewakaf}</p>
                  <p><strong>Jumlah Mushaf:</strong> {formData.jumlahMushaf} Qur&apos;an Standar Madinah</p>
                  <p><strong>Lokasi Penyaluran:</strong> {formData.lokasiWakaf}</p>
                </div>
                <div className="pt-4 flex justify-center gap-3">
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Assalamu'alaikum Admin, saya ingin konfirmasi pendaftaran Wakaf Qur'an atas nama: ${formData.namaPewakaf} (${formData.jumlahMushaf} Mushaf)`)}`}
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
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-3 pb-3 border-b">
                  <span className="font-bold text-xs uppercase tracking-wider text-sky-600 block flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-sky-600" /> 1. Data Pewakaf
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Niat Atas Nama (Opsional)</label>
                    <Input
                      type="text"
                      value={formData.niatAtasNama}
                      onChange={(e) => setFormData((p) => ({ ...p, niatAtasNama: e.target.value }))}
                      placeholder="Misal: Untuk Almarhum Fulan bin Fulan"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-sky-600 block flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-sky-600" /> 2. Rincian Wakaf Al-Qur&apos;an
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Jumlah Mushaf Al-Qur&apos;an</label>
                      <select
                        value={formData.jumlahMushaf}
                        onChange={(e) => setFormData((p) => ({ ...p, jumlahMushaf: parseInt(e.target.value, 10) }))}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                      >
                        <option value={1}>1 Mushaf</option>
                        <option value={5}>5 Mushaf Paket Keluarga</option>
                        <option value={10}>10 Mushaf Paket Barokah</option>
                        <option value={20}>20 Mushaf Paket Jamaah</option>
                        <option value={50}>50 Mushaf Paket Masjid</option>
                        <option value={100}>100 Mushaf Paket Akbar</option>
                      </select>
                    </div>

                    <div className="space-y-1">
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

                  <div className="space-y-1">
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
                  <Button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white">
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
