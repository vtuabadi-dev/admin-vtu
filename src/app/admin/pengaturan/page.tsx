"use client";

import { useEffect, useState } from "react";
import { Save, Sparkles, Building2, CheckCircle2, User, MapPin, KeyRound, Lock, AlertCircle, Loader2, Phone, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Select } from "@/shared/components/ui/Select";
import { BankSelect } from "@/shared/components/ui/BankSelect";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { OcrSettingsTab } from "./components/OcrSettingsTab";
import { TelegramBroadcastTab } from "./components/TelegramBroadcastTab";
import { DAFTAR_KANTOR_CABANG, getKantorCabang } from "@/shared/lib/kantor-cabang";
import {
  getCompanyProfile,
  saveCompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  type CompanyProfile,
} from "@/shared/lib/company-config";

const DEFAULT_WA_INVOICE_TPL = `*INVOICE PEMBAYARAN RESMI — VTU ABADI TRAVEL*
--------------------------------------------------
Assalamu'alaikum Warahmatullahi Wabarakatuh.

Yth. *{NAMA_GROUP}* (Kode Reg: *{KODE_REG}*)
Alhamdulillah, pembayaran Anda telah berhasil kami verifikasi dengan rincian sebagai berikut:

📄 *No. Invoice:* {NO_INVOICE}
📦 *Paket Umroh:* {NAMA_PAKET}
💳 *Jenis Pembayaran:* {JENIS_PEMBAYARAN}
💰 *Nominal Terverifikasi:* Rp {NOMINAL}
{RINCIAN_TAMBAHAN}
📅 *Tanggal Transaksi:* {TANGGAL}
🏦 *Metode / Bank:* {BANK}
✅ *Status:* LUNAS / TERVERIFIKASI

📥 *Unduh Dokumen PDF Resmi Secara Online (Direct Download):*
👉 {LINK_PDF_INVOICE}

Dokumen kuitansi & invoice ini merupakan bukti pembayaran resmi yang diterbitkan oleh PT Vauza Tamma Abadi (VTU ABADI Travel).
Semoga Allah SWT senantiasa memberikan kelancaran dan kemudahan dalam persiapan ibadah ke Baitullah.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
*Finance & Operational Team — VTU ABADI Travel*
🌐 https://vtuabadi.com`;

// ── Settings section wrapper ──
function SettingSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-stone-800 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Profil & Legalitas Perusahaan (PT) ──
function ProfilPerusahaan() {
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/general");
        const json = await res.json();
        if (json.success && json.data) {
          setProfile((prev) => ({
            ...prev,
            companyName: json.data.companyName || prev.companyName,
            companyBrand: json.data.companyBrand || prev.companyBrand,
            companyLicense: json.data.companyLicense || prev.companyLicense,
            companyAddress: json.data.companyAddress || prev.companyAddress,
            companyPhone: json.data.companyPhone || prev.companyPhone,
            companyEmail: json.data.companyEmail || prev.companyEmail,
            companyWebsite: json.data.companyWebsite || prev.companyWebsite,
            companyDirector: json.data.companyDirector || prev.companyDirector,
            companyDirectorTitle: json.data.companyDirectorTitle || prev.companyDirectorTitle,
          }));
          return;
        }
      } catch {}
      setProfile(getCompanyProfile());
    }
    load();
  }, []);

  const handleSave = async () => {
    saveCompanyProfile(profile);
    try {
      await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch (e) {
      console.warn("Failed to persist to server API, saved to localStorage", e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3">
        <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          <strong>Master Referensi Perusahaan:</strong> Data identitas legal di bawah ini menjadi <em>Single Source of Truth</em> resmi untuk seluruh Kop Surat, Generator PDF Surat, Kuitansi/Invoice, Verifikasi QR Code, dan Pesan WhatsApp.
        </div>
      </div>

      <SettingSection
        title="Badan Hukum & Identitas Resmi"
        desc="Nama PT dan Izin Kemenag yang dicantumkan pada seluruh dokumen operasional"
      >
        <SettingRow
          label="Nama Legal PT / Perusahaan"
          desc="Nama resmi badan hukum (Contoh: PT. VAUZA TAMMA ABADI)"
        >
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm font-bold text-primary"
            value={profile.companyName}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
            placeholder="PT. VAUZA TAMMA ABADI"
          />
        </SettingRow>

        <SettingRow
          label="Nama Brand / Merk Dagang"
          desc="Nama komersial travel (Contoh: VTU ABADI Travel)"
        >
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold"
            value={profile.companyBrand}
            onChange={(e) => setProfile({ ...profile, companyBrand: e.target.value })}
            placeholder="VTU ABADI Travel"
          />
        </SettingRow>

        <SettingRow
          label="Izin PPIU / SK Kemenag RI"
          desc="Legalitas izin penyelenggara ibadah umroh resmi Kemenag RI"
        >
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={profile.companyLicense}
            onChange={(e) => setProfile({ ...profile, companyLicense: e.target.value })}
            placeholder="Penyelenggara Perjalanan Ibadah Umroh (PPIU) Kemenag RI No. U.400 Tahun 2021"
          />
        </SettingRow>
      </SettingSection>

      <SettingSection
        title="Alamat & Kontak Kantor Pusat"
        desc="Lokasi kantor dan saluran komunikasi resmi travel"
      >
        <SettingRow label="Alamat Kantor Pusat" desc="Alamat lengkap yang tercantum pada footer & kop surat">
          <textarea
            className="w-80 rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
            rows={2}
            value={profile.companyAddress}
            onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
            placeholder="Ruko Gateway Blok C-12, Waru, Sidoarjo - Jawa Timur"
          />
        </SettingRow>

        <SettingRow label="Telepon Kantor / Hotline" desc="Nomor telepon kantor operasional">
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={profile.companyPhone}
            onChange={(e) => setProfile({ ...profile, companyPhone: e.target.value })}
            placeholder="(031) 854-4455"
          />
        </SettingRow>

        <SettingRow label="Email Resmi" desc="Email resmi pelayanan jamaah">
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={profile.companyEmail}
            onChange={(e) => setProfile({ ...profile, companyEmail: e.target.value })}
            placeholder="info@vauzatamma.co.id"
          />
        </SettingRow>

        <SettingRow label="Website Resmi" desc="URL portal web resmi">
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={profile.companyWebsite}
            onChange={(e) => setProfile({ ...profile, companyWebsite: e.target.value })}
            placeholder="https://vtuabadi.com"
          />
        </SettingRow>
      </SettingSection>

      <SettingSection
        title="Penandatangan Dokumen Resmi"
        desc="Pejabat direksi yang menandatangani surat rekomendasi & dokumen operasional"
      >
        <SettingRow label="Nama Pimpinan / Direktur" desc="Nama lengkap penandatangan surat resmi">
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm font-bold"
            value={profile.companyDirector}
            onChange={(e) => setProfile({ ...profile, companyDirector: e.target.value })}
            placeholder="H. FAISAL WAHYUDI"
          />
        </SettingRow>

        <SettingRow label="Jabatan Penandatangan" desc="Jabatan resmi struktural di perusahaan">
          <input
            className="h-9 w-80 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={profile.companyDirectorTitle}
            onChange={(e) => setProfile({ ...profile, companyDirectorTitle: e.target.value })}
            placeholder="Direktur Utama"
          />
        </SettingRow>
      </SettingSection>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} className="gap-1.5 bg-primary text-primary-foreground font-bold shadow-sm">
          <Save className="h-3.5 w-3.5" />
          Simpan Profil Perusahaan
        </Button>
        {saved && (
          <Badge variant="success" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Profil Perusahaan Berhasil Disimpan & Sinkron!
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Profil & Akun Admin ──
function ProfilAkun() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "super_admin",
    secondaryRoles: [] as string[],
    kantorCabang: "Malang",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/profile");
        const json = await res.json();
        if (json.success && json.data) {
          setFormData((prev) => ({
            ...prev,
            name: json.data.name || "",
            email: json.data.email || "",
            phone: json.data.phone || "",
            role: json.data.role || "super_admin",
            secondaryRoles: json.data.secondaryRoles || [],
            kantorCabang: json.data.kantorCabang || "Malang",
          }));
        }
      } catch (err) {
        console.error("Gagal memuat profil admin:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setStatusMessage(null);

    if (!formData.name.trim()) {
      setStatusMessage({ type: "error", text: "Nama pengelola wajib diisi." });
      return;
    }

    if (!formData.email.trim()) {
      setStatusMessage({ type: "error", text: "Email pengelola wajib diisi." });
      return;
    }

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setStatusMessage({ type: "error", text: "Password baru minimal 6 karakter." });
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setStatusMessage({ type: "error", text: "Password baru dan konfirmasi password tidak cocok." });
        return;
      }
      if (!formData.currentPassword) {
        setStatusMessage({ type: "error", text: "Password saat ini wajib diisi untuk verifikasi pergantian password." });
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        kantorCabang: formData.kantorCabang,
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
        payload.confirmPassword = formData.confirmPassword;
      }

      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (resJson.success) {
        setStatusMessage({
          type: "success",
          text: formData.newPassword
            ? "Data profil dan password baru akun admin berhasil diperbarui!"
            : "Data profil dan penempatan kantor berhasil disimpan!",
        });
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({
          type: "error",
          text: resJson.message || "Gagal menyimpan perubahan akun admin.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Terjadi kesalahan pada server.",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedOffice = getKantorCabang(formData.kantorCabang);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">Memuat informasi akun admin...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Alert status notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. INFORMASI AKUN & IDENTITAS PENGELOLA */}
      <SettingSection
        title="Informasi Akun & Pengelola"
        desc="Identitas akun administrator yang digunakan dalam operasional VTU Travel"
      >
        <SettingRow
          label="Nama Lengkap"
          desc="Nama lengkap resmi pengelola yang tercantum di sistem dan tanda tangan digital"
        >
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="h-9 w-80 rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm font-semibold"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nama Lengkap Admin"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Email Akun Pengelola"
          desc="Email resmi untuk login dan penerimaan notifikasi keamanan sistem"
        >
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              className="h-9 w-80 rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm font-semibold"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@vtu.id"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Nomor WhatsApp / Telepon"
          desc="Nomor WhatsApp aktif pengelola untuk komunikasi internal dan delegasi tugas"
        >
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="h-9 w-80 rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contoh: 081234567890"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Hak Akses / Role Sistem"
          desc="Tingkat otorisasi modul operasional yang diberikan oleh Super Admin"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-bold tracking-wider py-1 px-2.5 bg-primary/10 text-primary border-primary/30">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {formData.role.replace(/_/g, " ")}
            </Badge>
            {formData.secondaryRoles.length > 0 && (
              <span className="text-xs text-muted-foreground">
                (+{formData.secondaryRoles.length} peran sekunder)
              </span>
            )}
          </div>
        </SettingRow>
      </SettingSection>

      {/* 2. PENEMPATAN KANTOR CABANG */}
      <SettingSection
        title="Penempatan Kantor Cabang"
        desc="Atur kantor fisik tempat Anda bertugas melayani jamaah dan tamu travel"
      >
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            <MapPin className="w-4 h-4 text-amber-600" />
            Penting untuk Modul Buku Tamu & Registrasi Langsung
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
            Kantor penempatan yang Anda pilih di bawah ini akan secara otomatis menjadi identitas kantor penerima saat Anda mencatat tamu di <strong>Buku Tamu</strong>, mengaitkan konsultasi calon jamaah, dan menyusun laporan kunjungan per kantor cabang.
          </p>
        </div>

        <SettingRow
          label="Kantor Penempatan Admin"
          desc="Pilih kantor cabang tempat Anda aktif berdinas saat ini"
        >
          <div className="w-80">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.kantorCabang}
              onChange={(e) => setFormData({ ...formData, kantorCabang: e.target.value })}
            >
              {DAFTAR_KANTOR_CABANG.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} ({k.kota})
                </option>
              ))}
            </select>
          </div>
        </SettingRow>

        {/* Live Preview Alamat Kantor Terpilih */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-stone-800 bg-slate-50 dark:bg-stone-900/50 flex items-start gap-3">
          <div className="p-2 rounded-md bg-white dark:bg-stone-800 border text-primary shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>{selectedOffice.nama}</span>
              {selectedOffice.isPusat && (
                <Badge variant="success" className="text-[10px] py-0 px-1.5">Pusat</Badge>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">{selectedOffice.alamat}</p>
            {selectedOffice.telepon && (
              <p className="text-muted-foreground font-mono">Telp / Hotline: {selectedOffice.telepon}</p>
            )}
          </div>
        </div>
      </SettingSection>

      {/* 3. KEAMANAN & GANTI PASSWORD */}
      <SettingSection
        title="Keamanan Akun & Ubah Password"
        desc="Perbarui password login Anda secara berkala untuk menjaga keamanan data operasional travel"
      >
        <SettingRow
          label="Password Saat Ini"
          desc="Wajib diisi jika Anda ingin mengganti password login baru"
        >
          <div className="relative w-80">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type={showCurrentPassword ? "text" : "password"}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-10 py-1 text-sm"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="Ketik password saat ini..."
            />
            <button
              type="button"
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Password Baru"
          desc="Gunakan minimal 6 karakter kombinasi huruf dan angka"
        >
          <div className="relative w-80">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type={showNewPassword ? "text" : "password"}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-10 py-1 text-sm"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Password baru (min. 6 karakter)"
            />
            <button
              type="button"
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Konfirmasi Password Baru"
          desc="Ketik ulang password baru untuk memastikan kecocokan"
        >
          <div className="relative w-80">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type={showNewPassword ? "text" : "password"}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Ketik ulang password baru"
            />
          </div>
        </SettingRow>
      </SettingSection>

      {/* TOMBOL SIMPAN */}
      <div className="flex items-center gap-3 pt-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-primary text-primary-foreground font-bold shadow-md hover:opacity-90"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan Akun & Penempatan"}
        </Button>
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
  const [bankName, setBankName] = useState("Bank Mandiri");
  const [bankAccount, setBankAccount] = useState("144-00-0018881-0");
  const [bankHolder, setBankHolder] = useState("PT VTU ABADI TRAVEL");
  const [minDpPerPax, setMinDpPerPax] = useState("5000000");
  const [maxTahapCicilan, setMaxTahapCicilan] = useState<string>("none");
  const [waInvoiceTemplate, setWaInvoiceTemplate] = useState<string>(DEFAULT_WA_INVOICE_TPL);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings/general");
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.bankName) setBankName(json.data.bankName);
          if (json.data.bankAccount) setBankAccount(json.data.bankAccount);
          if (json.data.bankHolder) setBankHolder(json.data.bankHolder);
          if (json.data.minDpPerPax) setMinDpPerPax(json.data.minDpPerPax);
          if (json.data.maxTahapCicilan) setMaxTahapCicilan(json.data.maxTahapCicilan);
          if (json.data.waInvoiceTemplate) setWaInvoiceTemplate(json.data.waInvoiceTemplate);
          return;
        }
      } catch (e) {
        console.warn("Falling back to local storage for bank settings", e);
      }

      if (typeof window !== "undefined") {
        const savedConfig = localStorage.getItem("vtu_bank_config");
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            if (parsed.bankName) setBankName(parsed.bankName);
            if (parsed.bankAccount) setBankAccount(parsed.bankAccount);
            if (parsed.bankHolder) setBankHolder(parsed.bankHolder);
            if (parsed.minDpPerPax) setMinDpPerPax(parsed.minDpPerPax);
            if (parsed.maxTahapCicilan) setMaxTahapCicilan(parsed.maxTahapCicilan);
            if (parsed.waInvoiceTemplate) setWaInvoiceTemplate(parsed.waInvoiceTemplate);
          } catch (e) {}
        }
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const payload = { bankName, bankAccount, bankHolder, minDpPerPax, maxTahapCicilan, waInvoiceTemplate };
    if (typeof window !== "undefined") {
      localStorage.setItem("vtu_bank_config", JSON.stringify(payload));
    }

    try {
      await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Gagal simpan ke server:", err);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <SettingSection title="Rekening Tujuan Pembayaran (DP & Pelunasan)" desc="Rekening bank resmi yang ditampilkan pada Step 8 Formulir Pendaftaran Online">
        <SettingRow label="Nama Bank" desc="Nama bank tujuan transfer resmi (misal: BSI, Bank Mandiri, BCA)">
          <BankSelect
            value={bankName}
            onChange={(val) => setBankName(val)}
            placeholder="Cari / Pilih Nama Bank..."
            className="w-64"
            size="sm"
          />
        </SettingRow>
        <SettingRow label="Nomor Rekening" desc="Nomor rekening perusahaan">
          <input
            className="h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono font-bold text-blue-900 dark:text-blue-300"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="144-00-0018881-0"
          />
        </SettingRow>
        <SettingRow label="Atas Nama (A/N)" desc="Nama pemilik rekening sesuai buku tabungan">
          <input
            className="h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium"
            value={bankHolder}
            onChange={(e) => setBankHolder(e.target.value)}
            placeholder="PT VTU ABADI TRAVEL"
          />
        </SettingRow>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            💡 Data ini langsung disinkronkan ke Langkah 8 Formulir Pendaftaran Online seluruh jamaah.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} size="sm" className="gap-1.5 h-8 text-xs">
              <Save className="h-3.5 w-3.5" />
              Simpan Rekening
            </Button>
            {saved && <span className="text-xs text-success font-semibold">Tersimpan!</span>}
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Aturan Pembayaran" desc="Konfigurasi skema pembayaran dan toleransi keterlambatan">
        <SettingRow label="DP Minimum Per Pax" desc="Nominal DP minimum yang ditagihkan per jamaah (Pax)">
          <Select
            value={minDpPerPax}
            onChange={(e) => setMinDpPerPax(e.target.value)}
            options={[
              { value: "3000000", label: "Rp 3.000.000 / Pax" },
              { value: "5000000", label: "Rp 5.000.000 / Pax (Standar)" },
              { value: "7500000", label: "Rp 7.500.000 / Pax" },
              { value: "10000000", label: "Rp 10.000.000 / Pax" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Maksimal Tahap Cicilan" desc="Jumlah tahap cicilan yang diizinkan setelah DP">
          <Select
            value={maxTahapCicilan}
            onChange={(e) => setMaxTahapCicilan(e.target.value)}
            options={[
              { value: "none", label: "Tidak Ada (Bebas / Tanpa Batas)" },
              { value: "2", label: "2x Cicilan" },
              { value: "3", label: "3x Cicilan" },
              { value: "4", label: "4x Cicilan" },
              { value: "6", label: "6x Cicilan" },
              { value: "12", label: "12x Cicilan" },
            ]}
          />
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

      <SettingSection
        title="Template Pesan WhatsApp Invoice Resmi"
        desc="Atur susunan kata dan format pesan WhatsApp konfirmasi pembayaran invoice tergenerate"
      >
        <div className="space-y-3 pt-1">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
            <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Variabel Dinamis Yang Bisa Disisipkan (Klik untuk menyisipkan ke dalam template):
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "{NAMA_GROUP}",
                "{KODE_REG}",
                "{NO_INVOICE}",
                "{NAMA_PAKET}",
                "{JENIS_PEMBAYARAN}",
                "{NOMINAL}",
                "{RINCIAN_TAMBAHAN}",
                "{TANGGAL}",
                "{BANK}",
                "{LINK_PDF_INVOICE}",
              ].map((v) => (
                <code
                  key={v}
                  onClick={() => setWaInvoiceTemplate((prev) => prev + " " + v)}
                  className="px-2 py-0.5 rounded bg-background border text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-100 transition-colors"
                  title="Klik untuk menyisipkan variabel ini"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
          <textarea
            rows={12}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed"
            value={waInvoiceTemplate}
            onChange={(e) => setWaInvoiceTemplate(e.target.value)}
            placeholder="Ketik susunan template pesan WA invoice di sini..."
          />
        </div>
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
            { value: "perusahaan", label: "Profil Perusahaan (PT)" },
            { value: "akun", label: "Akun Admin" },
            { value: "sistem", label: "Preferensi Sistem" },
            { value: "notifikasi", label: "Notifikasi" },
            { value: "broadcast", label: "Broadcast Telegram" },
            { value: "operasional", label: "Aturan Operasional" },
            { value: "ocr", label: "Integrasi OCR" },
            { value: "infra", label: "Infrastruktur" },
          ]}
        >
          {(activeTab) => {
            switch (activeTab) {
              case "perusahaan":
                return <ProfilPerusahaan />;
              case "akun":
                return <ProfilAkun />;
              case "sistem":
                return <PreferensiSistem />;
              case "notifikasi":
                return <NotifikasiSettings />;
              case "broadcast":
                return <TelegramBroadcastTab />;
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
