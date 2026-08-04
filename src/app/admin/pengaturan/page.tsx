"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { OcrSettingsTab } from "./components/OcrSettingsTab";

// ── Settings section wrapper ──
function SettingSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Profil & Akun ──
function ProfilAkun() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SettingSection title="Informasi Akun" desc="Data akun administrator yang sedang login">
        <SettingRow label="Nama Lengkap" desc="Nama yang ditampilkan di sistem">
          <input
            className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            defaultValue="Admin VTU"
          />
        </SettingRow>
        <SettingRow label="Email" desc="Email untuk login dan notifikasi sistem">
          <input
            className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            defaultValue="admin@vtu.id"
          />
        </SettingRow>
        <SettingRow label="Role" desc="Role menentukan hak akses di sistem">
          <Select
            options={[
              { value: "super_admin", label: "Super Admin" },
              { value: "admin_operasional", label: "Admin Operasional" },
              { value: "admin_pembayaran", label: "Admin Pembayaran" },
              { value: "admin_manifest", label: "Admin Manifest" },
              { value: "admin_dokumen", label: "Admin Dokumen" },
            ]}
            defaultValue="super_admin"
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Keamanan" desc="Ubah password akun">
        <SettingRow label="Password Saat Ini">
          <input type="password" className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm" defaultValue="••••••••" />
        </SettingRow>
        <SettingRow label="Password Baru">
          <input type="password" className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm" placeholder="Min. 8 karakter" />
        </SettingRow>
        <SettingRow label="Konfirmasi Password">
          <input type="password" className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm" placeholder="Ketik ulang password" />
        </SettingRow>
      </SettingSection>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Simpan Perubahan
        </Button>
        {saved && <span className="text-xs text-success">Tersimpan!</span>}
      </div>
    </div>
  );
}

// ── Preferensi Sistem ──
function PreferensiSistem() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SettingSection title="Umum" desc="Konfigurasi dasar aplikasi">
        <SettingRow label="Nama Aplikasi">
          <input className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm" defaultValue="VTU Operational System" />
        </SettingRow>
        <SettingRow label="Mata Uang" desc="Default untuk tampilan dan export">
          <Select options={[{ value: "IDR", label: "IDR — Indonesian Rupiah" }, { value: "USD", label: "USD — US Dollar" }]} defaultValue="IDR" />
        </SettingRow>
        <SettingRow label="Zona Waktu" desc="Waktu lokal untuk jadwal dan deadline">
          <Select options={[{ value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" }, { value: "Asia/Makassar", label: "WITA — Asia/Makassar" }]} defaultValue="Asia/Jakarta" />
        </SettingRow>
        <SettingRow label="Bahasa">
          <Select options={[{ value: "id", label: "Bahasa Indonesia" }, { value: "en", label: "English" }]} defaultValue="id" />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Tampilan" desc="Preferensi tampilan antarmuka">
        <SettingRow label="Item per Halaman" desc="Jumlah data yang ditampilkan dalam tabel">
          <Select options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }]} defaultValue="25" />
        </SettingRow>
        <SettingRow label="Tema">
          <Select options={[{ value: "system", label: "Mengikuti Sistem" }, { value: "light", label: "Terang" }, { value: "dark", label: "Gelap" }]} defaultValue="system" />
        </SettingRow>
      </SettingSection>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Simpan Preferensi
        </Button>
        {saved && <span className="text-xs text-success">Tersimpan!</span>}
      </div>
    </div>
  );
}

// ── Notifikasi ──
function NotifikasiSettings() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SettingSection title="Email Notifications" desc="Notifikasi otomatis via email">
        <SettingRow label="Deadline Pembayaran" desc="Kirim notifikasi saat deadline mendekat">
          <Select options={[{ value: "7", label: "H-7" }, { value: "3", label: "H-3" }, { value: "1", label: "H-1" }]} defaultValue="7" />
        </SettingRow>
        <SettingRow label="Dokumen Revisi" desc="Notifikasi saat admin minta revisi dokumen">
          <input type="checkbox" defaultChecked className="mt-1" />
        </SettingRow>
        <SettingRow label="Pembayaran Diverifikasi" desc="Notifikasi saat pembayaran disetujui admin">
          <input type="checkbox" defaultChecked className="mt-1" />
        </SettingRow>
        <SettingRow label="Jamaah Siap Berangkat" desc="Notifikasi jika semua dokumen & pembayaran lengkap">
          <input type="checkbox" className="mt-1" />
        </SettingRow>
      </SettingSection>

      <SettingSection title="WhatsApp Notifications (Mendatang)" desc="Integrasi WhatsApp Gateway untuk notifikasi instan">
        <SettingRow label="WhatsApp Gateway URL" desc="Endpoint API WhatsApp Gateway">
          <input className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm" placeholder="https://api.whatsapp.example.com" />
        </SettingRow>
        <SettingRow label="API Key">
          <input type="password" className="h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm" placeholder="Masukkan API key" />
        </SettingRow>
      </SettingSection>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Simpan Notifikasi
        </Button>
        {saved && <span className="text-xs text-success">Tersimpan!</span>}
      </div>
    </div>
  );
}

// ── Aturan Operasional ──
function AturanOperasional() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SettingSection title="Aturan Pembayaran" desc="Konfigurasi skema pembayaran dan toleransi keterlambatan">
        <SettingRow label="DP Minimum" desc="Persentase DP dari total tagihan">
          <Select options={[
            { value: "10", label: "10%" }, { value: "20", label: "20%" },
            { value: "25", label: "25%" }, { value: "30", label: "30%" },
            { value: "50", label: "50%" },
          ]} defaultValue="25" />
        </SettingRow>
        <SettingRow label="Maksimal Tahap Cicilan" desc="Jumlah tahap cicilan yang diizinkan setelah DP">
          <Select options={[
            { value: "2", label: "2x Cicilan" }, { value: "3", label: "3x Cicilan" },
            { value: "4", label: "4x Cicilan" }, { value: "6", label: "6x Cicilan" },
          ]} defaultValue="3" />
        </SettingRow>
        <SettingRow label="Masa Tenggang (Grace Period)" desc="Hari toleransi setelah jatuh tempo sebelum status Overdue">
          <Select options={[
            { value: "0", label: "0 Hari (Langsung Overdue)" }, { value: "3", label: "3 Hari" },
            { value: "7", label: "7 Hari" }, { value: "14", label: "14 Hari" },
          ]} defaultValue="3" />
        </SettingRow>
        <SettingRow label="Minimum Pembayaran Cicilan" desc="Nominal minimum per pembayaran cicilan">
          <Select options={[
            { value: "500000", label: "Rp 500.000" }, { value: "1000000", label: "Rp 1.000.000" },
            { value: "2500000", label: "Rp 2.500.000" }, { value: "5000000", label: "Rp 5.000.000" },
          ]} defaultValue="1000000" />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Aturan Dokumen" desc="Threshold dan validasi dokumen jamaah">
        <SettingRow label="Peringatan Expired Paspor" desc="Bulan sebelum keberangkatan untuk peringatan paspor expired">
          <Select options={[
            { value: "3", label: "H-3 Bulan" }, { value: "6", label: "H-6 Bulan" },
            { value: "9", label: "H-9 Bulan" }, { value: "12", label: "H-12 Bulan" },
          ]} defaultValue="6" />
        </SettingRow>
        <SettingRow label="Auto-Reject Paspor Expired" desc="Tolak otomatis paspor yang masa berlaku kurang dari threshold">
          <input type="checkbox" defaultChecked className="mt-1" />
        </SettingRow>
        <SettingRow label="Maksimal Upload Ulang" desc="Batas maksimal jamaah upload ulang dokumen yang ditolak">
          <Select options={[
            { value: "3", label: "3x" }, { value: "5", label: "5x" },
            { value: "10", label: "10x" }, { value: "99", label: "Tidak Terbatas" },
          ]} defaultValue="5" />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Template Pengingat" desc="Template notifikasi untuk reminder ke jamaah">
        <SettingRow label="Reminder Pembayaran" desc="Pesan yang dikirim saat deadline pembayaran mendekat">
          <textarea
            className="h-20 w-80 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
            defaultValue="Yth. {nama_jamaah}, pembayaran {jenis_tagihan} sebesar {jumlah} untuk paket {nama_paket} jatuh tempo pada {tanggal_jatuh_tempo}. Segera lakukan pembayaran sebelum melewati batas waktu. Info: {kontak_admin}"
          />
        </SettingRow>
        <SettingRow label="Reminder Dokumen" desc="Pesan yang dikirim saat dokumen perlu direvisi">
          <textarea
            className="h-20 w-80 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
            defaultValue="Yth. {nama_jamaah}, dokumen {jenis_dokumen} Anda perlu direvisi dengan alasan: {alasan_revisi}. Silakan upload ulang dokumen melalui portal jamaah. Info: {kontak_admin}"
          />
        </SettingRow>
        <SettingRow label="Notifikasi Pelunasan" desc="Pesan otomatis saat pembayaran lunas">
          <textarea
            className="h-20 w-80 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
            defaultValue="Yth. {nama_jamaah}, pembayaran Anda untuk paket {nama_paket} telah LUNAS. Terima kasih. Dokumen Anda sedang diverifikasi untuk keberangkatan pada {tanggal_berangkat}."
          />
        </SettingRow>
      </SettingSection>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Simpan Aturan Operasional
        </Button>
        {saved && <span className="text-xs text-success">Tersimpan!</span>}
      </div>
    </div>
  );
}

// ── Database & Storage ──
function DatabaseStorage() {
  return (
    <div className="space-y-4">
      <SettingSection title="Database" desc="Koneksi database (read-only — dikelola via .env)">
        <SettingRow label="Status Koneksi" desc="Supabase PostgreSQL 16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Terhubung
          </span>
        </SettingRow>
        <SettingRow label="Provider" desc="Supabase Pooler (PgBouncer)">
          <span className="text-sm font-mono text-muted-foreground">aws-1-ap-northeast-1.pooler.supabase.com</span>
        </SettingRow>
        <SettingRow label="Database">
          <span className="text-sm font-mono text-muted-foreground">postgres</span>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Penyimpanan Dokumen" desc="Google Drive — cloud storage">
        <SettingRow label="Provider" desc="Google Drive API v3">
          <span className="text-sm font-medium">Google Drive</span>
        </SettingRow>
        <SettingRow label="Mount Path" desc="Path virtual dalam storage adapter">
          <span className="text-sm font-mono text-muted-foreground">/dokumen/*</span>
        </SettingRow>
      </SettingSection>

      <p className="text-xs text-muted-foreground pt-1">
        Konfigurasi koneksi diatur melalui file <code>.env</code>. Edit file tersebut dan restart container untuk mengubah konfigurasi.
      </p>
    </div>
  );
}

// ============================================================
// MAIN PENGATURAN PAGE
// ============================================================

export default function PengaturanPage() {
  return (
    <PermissionGuard module="sistem">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi sistem, akun, dan preferensi operasional
          </p>
        </div>

        <Tabs
          tabs={[
            { value: "akun", label: "Profil & Akun" },
            { value: "sistem", label: "Preferensi Sistem" },
            { value: "notifikasi", label: "Notifikasi" },
            { value: "operasional", label: "Aturan Operasional" },
            { value: "ocr", label: "Integrasi OCR" },
            { value: "infra", label: "Infrastruktur" },
          ]}
        >
          {(activeTab) => {
            switch (activeTab) {
              case "akun":
                return <ProfilAkun />;
              case "sistem":
                return <PreferensiSistem />;
              case "notifikasi":
                return <NotifikasiSettings />;
              case "operasional":
                return <AturanOperasional />;
              case "ocr":
                return <OcrSettingsTab />;
              case "infra":
                return <DatabaseStorage />;
              default:
                return null;
            }
          }}
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
