"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { ArrowLeft, Save } from "lucide-react";

export default function TambahKeberangkatanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.push("/admin/keberangkatan");
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Paket</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buat jadwal keberangkatan dan paket umroh baru
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Paket</CardTitle>
          <CardDescription>Masukkan detail utama paket keberangkatan ini</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Paket</label>
                <Input placeholder="Cth: Umroh Reguler Bintang 5" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kode Paket</label>
                <Input placeholder="Cth: UMR-REG-001" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Keberangkatan</label>
                <Input type="date" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Kepulangan</label>
                <Input type="date" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Maskapai</label>
                <Input placeholder="Cth: Saudia Airlines" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kuota</label>
                <Input type="number" placeholder="Cth: 45" required />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-sm font-medium text-foreground">Akomodasi Hotel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Hotel Mekkah</label>
                  <Input placeholder="Cth: Pullman Zamzam" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Hotel Madinah</label>
                  <Input placeholder="Cth: Anwar Al Madinah" required />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Paket
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
