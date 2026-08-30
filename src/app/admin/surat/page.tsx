"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  Printer,
  Copy,
  Check,
  Building2,
  GraduationCap,
  ScrollText,
  ShieldCheck,
  Award,
  RefreshCw,
  User,
  Sparkles,
  FileSignature,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { formatDate, formatDateShort, cn } from "@/shared/lib/utils";
import { useOperationalStore } from "@/stores/operational-store";
import { KOP_SURAT_BASE64 } from "@/server/assets/kop-surat";

export type SuratType =
  | "rekom"
  | "cuti-pekerja"
  | "cuti-sekolah"
  | "keterangan"
  | "tugas"
  | "klaim-asuransi";

interface SuratConfig {
  type: SuratType;
  title: string;
  shortLabel: string;
  subtitle: string;
  icon: any;
  badgeColor: string;
  defaultPerihal: string;
  defaultKodeNomor: string;
}

const SURAT_CONFIGS: Record<SuratType, SuratConfig> = {
  rekom: {
    type: "rekom",
    title: "Surat Rekomendasi Paspor",
    shortLabel: "Surat Rekom",
    subtitle: "Rekomendasi penerbitan/penggantian paspor umroh ke Kantor Imigrasi / Kemenag",
    icon: FileSignature,
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    defaultPerihal: "Rekomendasi Pembuatan / Penggantian Paspor Umroh",
    defaultKodeNomor: "SR-PASPOR",
  },
  "cuti-pekerja": {
    type: "cuti-pekerja",
    title: "Surat Cuti Pekerja",
    shortLabel: "Surat Cuti Pekerja",
    subtitle: "Surat permohonan izin dispensasi dan cuti kerja ke instansi / perusahaan",
    icon: Building2,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    defaultPerihal: "Permohonan Izin / Cuti Ibadah Umroh",
    defaultKodeNomor: "SC-KERJA",
  },
  "cuti-sekolah": {
    type: "cuti-sekolah",
    title: "Surat Cuti Sekolah / Kuliah",
    shortLabel: "Surat Cuti Sekolah",
    subtitle: "Surat permohonan dispensasi izin tidak masuk sekolah / perkuliahan",
    icon: GraduationCap,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    defaultPerihal: "Permohonan Izin Tidak Masuk Sekolah / Kuliah (Ibadah Umroh)",
    defaultKodeNomor: "SC-SEKOLAH",
  },
  keterangan: {
    type: "keterangan",
    title: "Surat Keterangan Jamaah",
    shortLabel: "Surat Keterangan",
    subtitle: "Surat keterangan resmi terdaftar sebagai calon jamaah umroh PT. VTU Abadi",
    icon: ScrollText,
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    defaultPerihal: "Surat Keterangan Terdaftar Calon Jamaah Umroh",
    defaultKodeNomor: "SK-JAMAAH",
  },
  tugas: {
    type: "tugas",
    title: "Surat Perintah Tugas Petugas",
    shortLabel: "Surat Tugas",
    subtitle: "Surat penugasan resmi Tour Leader, Muthawwif, Medis, & Tim Handling",
    icon: Award,
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    defaultPerihal: "Surat Perintah Tugas Operasional Ibadah Umroh",
    defaultKodeNomor: "ST-PETUGAS",
  },
  "klaim-asuransi": {
    type: "klaim-asuransi",
    title: "Surat Pengantar Klaim Asuransi",
    shortLabel: "Surat Klaim Asuransi",
    subtitle: "Surat pengantar klaim biaya medis, keterlambatan, atau pembatalan asuransi",
    icon: ShieldCheck,
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    defaultPerihal: "Permohonan Pengajuan Klaim Asuransi Perjalanan Umroh",
    defaultKodeNomor: "SKA-ASURANSI",
  },
};

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function getTodayFormatted(): { masehi: string; hijriyah: string; romanMonth: string; year: number } {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const masehi = today.toLocaleDateString("id-ID", options);
  const romanMonth = ROMAN_MONTHS[today.getMonth()] ?? "VIII";
  const year = today.getFullYear();
  return {
    masehi,
    hijriyah: "Safar 1448 H",
    romanMonth,
    year,
  };
}

export default function GenerateSuratPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL query type sync
  const queryType = (searchParams.get("type") as SuratType) || "rekom";
  const [activeType, setActiveType] = useState<SuratType>(
    SURAT_CONFIGS[queryType] ? queryType : "rekom"
  );

  // Sync state when URL searchParam changes
  useEffect(() => {
    const t = searchParams.get("type") as SuratType;
    if (t && SURAT_CONFIGS[t] && t !== activeType) {
      setActiveType(t);
    }
  }, [searchParams, activeType]);

  const handleTabChange = (type: SuratType) => {
    setActiveType(type);
    router.push(`/admin/surat?type=${type}`, { scroll: false });
  };

  // Operational store
  const storeKbrList = useOperationalStore((s) => s.keberangkatanList);
  const storeGroupList = useOperationalStore((s) => s.groupList);
  const storeJamaah = useOperationalStore((s) => s.jamaahList);
  const setStoreJamaah = useOperationalStore((s) => s.setJamaahList);
  const setStoreKbrList = useOperationalStore((s) => s.setKeberangkatanList);
  const setStoreGroupList = useOperationalStore((s) => s.setGroupList);

  const [loadingData, setLoadingData] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedJamaahId, setSelectedJamaahId] = useState<string>("");
  const [copiedText, setCopiedText] = useState(false);

  // Load packages & jamaah if not loaded
  useEffect(() => {
    async function initData() {
      if (storeKbrList.length === 0 || !storeJamaah || storeJamaah.length === 0) {
        setLoadingData(true);
        try {
          const [kbrRes, grpRes, jamRes] = await Promise.all([
            fetch("/api/keberangkatan"),
            fetch("/api/groups"),
            fetch("/api/jamaah?groupId=&limit=200"),
          ]);
          if (kbrRes.ok) {
            const kJson = await kbrRes.json();
            setStoreKbrList(kJson.data ?? []);
          }
          if (grpRes.ok) {
            const gJson = await grpRes.json();
            setStoreGroupList(gJson.data ?? []);
          }
          if (jamRes.ok) {
            const jJson = await jamRes.json();
            setStoreJamaah(jJson.data ?? []);
          }
        } catch (err) {
          console.error("Failed to fetch initial data for surat:", err);
        } finally {
          setLoadingData(false);
        }
      }
    }
    initData();
  }, [storeKbrList.length, storeJamaah, setStoreKbrList, setStoreGroupList, setStoreJamaah]);

  // Packages map
  const packageOptions = useMemo(() => {
    return (storeKbrList || []).map((k: any) => ({
      value: k.id,
      label: `${k.kodePaket || k.id} — ${k.namaPaket || k.name || "Paket Umroh"} (${formatDateShort(k.tanggalKeberangkatan || k.departureDate)})`,
      raw: k,
    }));
  }, [storeKbrList]);

  // Set default package if none selected
  useEffect(() => {
    if (!selectedPackageId && packageOptions.length > 0 && packageOptions[0]) {
      setSelectedPackageId(packageOptions[0].value);
    }
  }, [packageOptions, selectedPackageId]);

  // Filter jamaah by selected package
  const groupMap = useMemo(() => {
    const map: Record<string, any> = {};
    (storeGroupList || []).forEach((g: any) => {
      map[g.id] = g;
    });
    return map;
  }, [storeGroupList]);

  const packageJamaahList = useMemo(() => {
    if (!storeJamaah || storeJamaah.length === 0) return [];
    if (!selectedPackageId) return storeJamaah;
    return storeJamaah.filter((j: any) => {
      const g = groupMap[j.groupId];
      return g?.paketId === selectedPackageId || g?.paketKeberangkatanId === selectedPackageId;
    });
  }, [storeJamaah, selectedPackageId, groupMap]);

  // Selected package object
  const currentPackage = useMemo(() => {
    return (storeKbrList || []).find((k: any) => k.id === selectedPackageId);
  }, [storeKbrList, selectedPackageId]);

  // Current Date info
  const dateInfo = useMemo(() => getTodayFormatted(), []);

  // Form State
  const [nomorSurat, setNomorSurat] = useState<string>("");
  const [lampiran, setLampiran] = useState<string>("-");
  const [perihal, setPerihal] = useState<string>("");
  const [kotaTerbit, setKotaTerbit] = useState<string>("Surabaya");
  const [tanggalSurat, setTanggalSurat] = useState<string>(dateInfo.masehi);
  const [namaPenandatangan, setNamaPenandatangan] = useState<string>("H. Mohammad Ridwan, S.Pd.I");
  const [jabatanPenandatangan, setJabatanPenandatangan] = useState<string>("Direktur Operasional");

  // Specific Form Fields
  const [namaLengkap, setNamaLengkap] = useState<string>("");
  const [nik, setNik] = useState<string>("");
  const [nomorPaspor, setNomorPaspor] = useState<string>("");
  const [tempatLahir, setTempatLahir] = useState<string>("");
  const [tanggalLahir, setTanggalLahir] = useState<string>("");
  const [jenisKelamin, setJenisKelamin] = useState<string>("Laki-laki");
  const [alamat, setAlamat] = useState<string>("");

  // Package schedule fields
  const [namaPaket, setNamaPaket] = useState<string>("");
  const [durasiHari, setDurasiHari] = useState<string>("9 Hari");
  const [tanggalBerangkat, setTanggalBerangkat] = useState<string>("");
  const [tanggalPulang, setTanggalPulang] = useState<string>("");
  const [maskapai, setMaskapai] = useState<string>("Saudi Arabian Airlines");
  const [hotelMakkah, setHotelMakkah] = useState<string>("Pullman Zamzam Makkah");
  const [hotelMadinah, setHotelMadinah] = useState<string>("Rove Al Madinah");

  // Submenu specific extra fields
  // 1. Rekom
  const [kantorImigrasi, setKantorImigrasi] = useState<string>(
    "Kepala Kantor Imigrasi Kelas I Khusus TPI Surabaya"
  );
  const [keperluanRekom, setKeperluanRekom] = useState<string>(
    "Pembuatan Paspor Baru untuk Keberangkatan Ibadah Umroh"
  );

  // 2. Cuti Pekerja
  const [namaInstansi, setNamaInstansi] = useState<string>("PT. Maju Sejahtera Abadi");
  const [nipKaryawan, setNipKaryawan] = useState<string>("-");
  const [jabatanKaryawan, setJabatanKaryawan] = useState<string>("Staff Operasional");
  const [pimpinanTujuan, setPimpinanTujuan] = useState<string>("Pimpinan / HRD Department");

  // 3. Cuti Sekolah
  const [namaSekolah, setNamaSekolah] = useState<string>("SMA Negeri 1 Surabaya");
  const [nisnSiswa, setNisnSiswa] = useState<string>("-");
  const [kelasSiswa, setKelasSiswa] = useState<string>("Kelas XI IPA 2");
  const [kepalaSekolahTujuan, setKepalaSekolahTujuan] = useState<string>(
    "Bapak / Ibu Kepala Sekolah & Dewan Guru"
  );
  const [namaWali, setNamaWali] = useState<string>("");

  // 4. Keterangan
  const [keperluanKeterangan, setKeperluanKeterangan] = useState<string>(
    "Kelengkapan Administrasi dan Pengurusan Dokumen Resmi"
  );
  const [statusBooking, setStatusBooking] = useState<string>("Telah Terdaftar Resmi & Terkonfirmasi Lunas");

  // 5. Tugas
  const [peranPetugas, setPeranPetugas] = useState<string>("Tour Leader & Pembimbing Ibadah");
  const [noKontakPetugas, setNoKontakPetugas] = useState<string>("+62 812-3456-7890");
  const [jumlahJamaah, setJumlahJamaah] = useState<string>("45 Jamaah");
  const [lingkupTugas, setLingkupTugas] = useState<string>(
    "Membimbing ibadah manasik dan pelaksanaan umroh di Tanah Suci, mengoordinasikan akomodasi dan ziarah Makkah-Madinah, serta mengawal keselamatan dan kenyamanan rombongan jamaah."
  );

  // 6. Asuransi
  const [namaAsuransi, setNamaAsuransi] = useState<string>("PT Asuransi Zurich Syariah Indonesia");
  const [nomorPolis, setNomorPolis] = useState<string>("POL-VTU-2026-08892");
  const [jenisKlaim, setJenisKlaim] = useState<string>("Klaim Biaya Pengobatan Medis / Rawat Inap di Saudi Arabia");
  const [nilaiKlaim, setNilaiKlaim] = useState<string>("SAR 3.500 (Tiga Ribu Lima Ratus Riyal)");
  const [kronologiSingkat, setKronologiSingkat] = useState<string>(
    "Jamaah mengalami demam tinggi dan dehidrasi saat berada di Madinah sehingga memerlukan penanganan darurat dan rawat inap di Rumah Sakit Al-Ansar Madinah pada tanggal pelaksanaan ibadah."
  );

  // Auto-generate Nomor Surat when type or date changes
  const config = SURAT_CONFIGS[activeType];

  useEffect(() => {
    const randomSeq = String(Math.floor(Math.random() * 80) + 10).padStart(3, "0");
    setNomorSurat(`${randomSeq}/VTU-OPS/${config.defaultKodeNomor}/${dateInfo.romanMonth}/${dateInfo.year}`);
    setPerihal(config.defaultPerihal);
  }, [activeType, config.defaultKodeNomor, config.defaultPerihal, dateInfo.romanMonth, dateInfo.year]);

  // Sync Package Info when selectedPackage changes
  useEffect(() => {
    if (currentPackage) {
      const p = currentPackage as any;
      setNamaPaket(p.namaPaket || p.name || "PAKET UMROH VTU");
      if (p.tanggalKeberangkatan || p.departureDate) {
        setTanggalBerangkat(formatDate(p.tanggalKeberangkatan || p.departureDate));
      }
      if (p.tanggalKepulangan || p.returnDate) {
        setTanggalPulang(formatDate(p.tanggalKepulangan || p.returnDate));
      }
      if (p.programHari || p.durationDays) {
        setDurasiHari(`${p.programHari || p.durationDays} Hari`);
      }
      if (p.maskapai || p.airline) {
        setMaskapai(p.maskapai || p.airline);
      }
      if (p.hotelMakkah) {
        setHotelMakkah(p.hotelMakkah);
      }
      if (p.hotelMadinah) {
        setHotelMadinah(p.hotelMadinah);
      }
    }
  }, [currentPackage]);

  // Sync Jamaah Info when selectedJamaah changes
  const handleSelectJamaah = useCallback(
    (jId: string) => {
      setSelectedJamaahId(jId);
      const raw = (storeJamaah || []).find((item: any) => item.id === jId);
      if (raw) {
        const j = raw as any;
        setNamaLengkap(j.namaLengkap || "");
        setNik(j.nik || "");
        setNomorPaspor(j.nomorPaspor && j.nomorPaspor !== "-" ? j.nomorPaspor : "");
        setTempatLahir(j.tempatLahir || "Surabaya");
        setTanggalLahir(j.tanggalLahir ? formatDate(j.tanggalLahir) : "");
        setJenisKelamin(j.gender === "female" || j.jenisKelamin === "P" || j.jenisKelamin === "Perempuan" ? "Perempuan" : "Laki-laki");
        setAlamat(j.alamat || j.alamatLengkap || "-");
        setNamaWali(j.namaMahram || j.namaAyah || "-");
      }
    },
    [storeJamaah]
  );

  // Auto-select first jamaah in package
  useEffect(() => {
    if (packageJamaahList.length > 0 && !selectedJamaahId && packageJamaahList[0]) {
      handleSelectJamaah(packageJamaahList[0].id);
    }
  }, [packageJamaahList, selectedJamaahId, handleSelectJamaah]);

  // Clean Print action
  const handlePrint = () => {
    window.print();
  };

  // Plain Text generator for WhatsApp
  const generatePlainText = () => {
    return `*${config.title.toUpperCase()}*\nPT. VISI TOUR UTAMA (VTU ABADI)\nNo: ${nomorSurat}\nPerihal: ${perihal}\n\nAssalamu'alaikum Wr. Wb.\n\nMenerangkan bahwa calon jamaah:\n• Nama: *${namaLengkap || "..."}*\n• NIK: ${nik || "-"}\n• No. Paspor: ${nomorPaspor || "-"}\n• Paket: ${namaPaket} (${durasiHari})\n• Tgl Berangkat: ${tanggalBerangkat} s/d ${tanggalPulang}\n• Maskapai: ${maskapai}\n\nDemikian surat ini dikeluarkan resmi oleh PT. Visi Tour Utama untuk dipergunakan sebagaimana mestinya.\n\nWassalamu'alaikum Wr. Wb.\n\n*H. Mohammad Ridwan, S.Pd.I*\nDirektur Operasional`;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generatePlainText());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generatePlainText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Generate Surat Operasional</h1>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" />
              Template Resmi PPIU
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cetak dan ekspor surat rekomendasi, dispensasi cuti, surat tugas, dan klaim asuransi resmi ber-kop surat.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="border-stone-300 dark:border-stone-700"
          >
            {copiedText ? <Check className="mr-1.5 h-4 w-4 text-success" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copiedText ? "Tersalin!" : "Salin Teks"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
          >
            <Share2 className="mr-1.5 h-4 w-4" />
            Kirim WhatsApp
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Cetak / Print Surat
          </Button>
        </div>
      </div>

      {/* Submenu Tabs Navigation */}
      <div className="print:hidden border-b border-border/60 pb-px">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {(Object.keys(SURAT_CONFIGS) as SuratType[]).map((key) => {
            const item = SURAT_CONFIGS[key];
            const Icon = item.icon;
            const isActive = activeType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Layout: Left Form + Right Live Letter Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Input Configuration Form (Col 5) */}
        <div className="lg:col-span-5 space-y-4 print:hidden">
          {/* Quick Auto-Fill Selector Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Sumber Data & Auto-Fill Jamaah
                </span>
                {loadingData && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Memuat...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Package Select */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">1. Pilih Paket Keberangkatan</label>
                <Select
                  value={selectedPackageId}
                  onChange={(e) => {
                    setSelectedPackageId(e.target.value);
                    setSelectedJamaahId("");
                  }}
                  options={packageOptions}
                  placeholder="-- Pilih Paket Keberangkatan --"
                />
              </div>

              {/* Jamaah Select */}
              {activeType !== "tugas" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">2. Pilih Jamaah Terdaftar ({packageJamaahList.length} Pax)</label>
                  <Select
                    value={selectedJamaahId}
                    onChange={(e) => handleSelectJamaah(e.target.value)}
                    options={[
                      { value: "", label: "-- Input Manual / Pilih Jamaah --" },
                      ...packageJamaahList.map((j: any) => ({
                        value: j.id,
                        label: `${j.nomorPeserta || j.registrationId || "JM"} — ${j.namaLengkap} (${j.nik || "No NIK"})`,
                      })),
                    ]}
                    placeholder="-- Pilih Jamaah --"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Form Configuration Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Parameter & Isi Surat
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Nomor Surat</label>
                  <Input
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Lampiran</label>
                  <Input
                    value={lampiran}
                    onChange={(e) => setLampiran(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Perihal Surat</label>
                <Input
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              {/* Dynamic Submenu Inputs */}
              {activeType === "rekom" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Spesifik Surat Rekom Paspor</h4>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Tujuan Kantor Imigrasi</label>
                    <Input
                      value={kantorImigrasi}
                      onChange={(e) => setKantorImigrasi(e.target.value)}
                      placeholder="e.g. Kepala Kantor Imigrasi Kelas I Khusus TPI Surabaya"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Keperluan Rekomendasi</label>
                    <Input
                      value={keperluanRekom}
                      onChange={(e) => setKeperluanRekom(e.target.value)}
                      placeholder="e.g. Pembuatan Paspor Baru untuk Ibadah Umroh"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {activeType === "cuti-pekerja" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Spesifik Cuti Pekerja</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Nama Instansi / Kantor</label>
                      <Input
                        value={namaInstansi}
                        onChange={(e) => setNamaInstansi(e.target.value)}
                        placeholder="Nama Perusahaan"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Tujuan Pimpinan / HRD</label>
                      <Input
                        value={pimpinanTujuan}
                        onChange={(e) => setPimpinanTujuan(e.target.value)}
                        placeholder="Pimpinan HRD"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">NIP / NIK Karyawan</label>
                      <Input
                        value={nipKaryawan}
                        onChange={(e) => setNipKaryawan(e.target.value)}
                        placeholder="NIP Karyawan"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Jabatan Karyawan</label>
                      <Input
                        value={jabatanKaryawan}
                        onChange={(e) => setJabatanKaryawan(e.target.value)}
                        placeholder="Jabatan"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeType === "cuti-sekolah" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Spesifik Cuti Sekolah / Kuliah</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Nama Sekolah / Kampus</label>
                      <Input
                        value={namaSekolah}
                        onChange={(e) => setNamaSekolah(e.target.value)}
                        placeholder="e.g. SMA Negeri 1 Surabaya"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Tujuan Pimpinan</label>
                      <Input
                        value={kepalaSekolahTujuan}
                        onChange={(e) => setKepalaSekolahTujuan(e.target.value)}
                        placeholder="Kepala Sekolah"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">NISN / NIM Siswa</label>
                      <Input
                        value={nisnSiswa}
                        onChange={(e) => setNisnSiswa(e.target.value)}
                        placeholder="NISN"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Kelas / Jurusan</label>
                      <Input
                        value={kelasSiswa}
                        onChange={(e) => setKelasSiswa(e.target.value)}
                        placeholder="Kelas XI IPA"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Nama Orang Tua / Pendamping</label>
                    <Input
                      value={namaWali}
                      onChange={(e) => setNamaWali(e.target.value)}
                      placeholder="Nama Wali / Orang Tua"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {activeType === "keterangan" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Spesifik Surat Keterangan</h4>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Keperluan Surat Keterangan</label>
                    <Input
                      value={keperluanKeterangan}
                      onChange={(e) => setKeperluanKeterangan(e.target.value)}
                      placeholder="e.g. Kelengkapan Administrasi Perbankan"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Status Pendaftaran</label>
                    <Input
                      value={statusBooking}
                      onChange={(e) => setStatusBooking(e.target.value)}
                      placeholder="Status Booking"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {activeType === "tugas" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Spesifik Surat Perintah Tugas</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Peran / Penugasan</label>
                      <Input
                        value={peranPetugas}
                        onChange={(e) => setPeranPetugas(e.target.value)}
                        placeholder="Tour Leader & Muthawwif"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Kontak Petugas</label>
                      <Input
                        value={noKontakPetugas}
                        onChange={(e) => setNoKontakPetugas(e.target.value)}
                        placeholder="+62 812-..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Jumlah Jamaah Rombongan</label>
                    <Input
                      value={jumlahJamaah}
                      onChange={(e) => setJumlahJamaah(e.target.value)}
                      placeholder="45 Jamaah"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Lingkup Tanggung Jawab & Tugas</label>
                    <textarea
                      value={lingkupTugas}
                      onChange={(e) => setLingkupTugas(e.target.value)}
                      rows={3}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {activeType === "klaim-asuransi" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Spesifik Klaim Asuransi</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Perusahaan Asuransi</label>
                      <Input
                        value={namaAsuransi}
                        onChange={(e) => setNamaAsuransi(e.target.value)}
                        placeholder="Nama Asuransi"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-muted-foreground">Nomor Polis / Sertifikat</label>
                      <Input
                        value={nomorPolis}
                        onChange={(e) => setNomorPolis(e.target.value)}
                        placeholder="POL-VTU-..."
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Jenis Pengajuan Klaim</label>
                    <Input
                      value={jenisKlaim}
                      onChange={(e) => setJenisKlaim(e.target.value)}
                      placeholder="e.g. Biaya Rawat Inap di Saudi"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Estimasi Nilai Klaim</label>
                    <Input
                      value={nilaiKlaim}
                      onChange={(e) => setNilaiKlaim(e.target.value)}
                      placeholder="SAR 3.500"
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Kronologi Singkat Kejadian</label>
                    <textarea
                      value={kronologiSingkat}
                      onChange={(e) => setKronologiSingkat(e.target.value)}
                      rows={3}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Biodata Jamaah / Petugas Details */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {activeType === "tugas" ? "Data Petugas Bertugas" : "Data Jamaah"}
                </h4>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Nama Lengkap</label>
                  <Input
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">NIK</label>
                    <Input
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      placeholder="3515..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Nomor Paspor</label>
                    <Input
                      value={nomorPaspor}
                      onChange={(e) => setNomorPaspor(e.target.value)}
                      placeholder="B 1234567"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Tempat Lahir</label>
                    <Input
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Tanggal Lahir</label>
                    <Input
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Jenis Kelamin</label>
                    <Select
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value)}
                      options={[
                        { value: "Laki-laki", label: "Laki-laki" },
                        { value: "Perempuan", label: "Perempuan" },
                      ]}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Alamat Lengkap</label>
                    <Input
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Package & Flight Details */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Jadwal & Akomodasi Paket</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Nama Paket</label>
                    <Input
                      value={namaPaket}
                      onChange={(e) => setNamaPaket(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Durasi Program</label>
                    <Input
                      value={durasiHari}
                      onChange={(e) => setDurasiHari(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Tanggal Berangkat</label>
                    <Input
                      value={tanggalBerangkat}
                      onChange={(e) => setTanggalBerangkat(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Tanggal Pulang</label>
                    <Input
                      value={tanggalPulang}
                      onChange={(e) => setTanggalPulang(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Maskapai Penerbangan</label>
                  <Input
                    value={maskapai}
                    onChange={(e) => setMaskapai(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Signer Info */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pengesahan Surat</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Kota Terbit</label>
                    <Input
                      value={kotaTerbit}
                      onChange={(e) => setKotaTerbit(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Tanggal Terbit</label>
                    <Input
                      value={tanggalSurat}
                      onChange={(e) => setTanggalSurat(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Penandatangan</label>
                    <Input
                      value={namaPenandatangan}
                      onChange={(e) => setNamaPenandatangan(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Jabatan</label>
                    <Input
                      value={jabatanPenandatangan}
                      onChange={(e) => setJabatanPenandatangan(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Interactive Letter Sheet (Col 7 / Full on Print) */}
        <div className="lg:col-span-7 w-full">
          {/* Printable Sheet Container */}
          <div
            id="printable-surat-sheet"
            className={cn(
              "bg-white text-black p-8 sm:p-12 rounded-xl shadow-md border border-stone-200 min-h-[950px] font-serif text-[13px] leading-relaxed relative",
              "print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-0 print:w-full print:rounded-none"
            )}
          >
            {/* ── KOP SURAT HEADER ──────────────────────────── */}
            <div className="border-b-2 border-stone-900 pb-3 mb-6">
              {KOP_SURAT_BASE64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={KOP_SURAT_BASE64}
                  alt="Kop Surat PT. Visi Tour Utama"
                  className="w-full object-contain max-h-32 mb-1"
                />
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-emerald-950 font-sans">
                      PT. VISI TOUR UTAMA (VTU ABADI)
                    </h2>
                    <p className="text-[11px] font-sans text-stone-600">
                      Penyelenggara Perjalanan Ibadah Umrah (PPIU) Resmi Kemenag RI No. U.404 / Akreditasi A
                    </p>
                    <p className="text-[10px] font-sans text-stone-500">
                      Jl. Raya Sedati Agung No. 58, Sidoarjo, Jawa Timur 61253 • Telp: (031) 8688-999 • Email: operasional@vtuabadi.com
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── METADATA HEADER: Nomor, Lampiran, Tanggal ───── */}
            <div className="flex justify-between items-start mb-6 text-[12px] font-sans">
              <div className="space-y-0.5">
                <p>
                  <span className="inline-block w-20">Nomor</span>: <span className="font-mono font-semibold">{nomorSurat}</span>
                </p>
                <p>
                  <span className="inline-block w-20">Lampiran</span>: {lampiran}
                </p>
                <p>
                  <span className="inline-block w-20">Perihal</span>: <strong className="underline">{perihal}</strong>
                </p>
              </div>
              <div className="text-right">
                <p>
                  {kotaTerbit}, {tanggalSurat}
                </p>
              </div>
            </div>

            {/* ── TUJUAN SURAT ──────────────────────────────── */}
            <div className="mb-5 font-sans text-[12px]">
              <p>Kepada Yth.</p>
              {activeType === "rekom" && (
                <>
                  <p className="font-bold">{kantorImigrasi}</p>
                  <p>Di Tempat</p>
                </>
              )}
              {activeType === "cuti-pekerja" && (
                <>
                  <p className="font-bold">{pimpinanTujuan}</p>
                  <p className="font-semibold">{namaInstansi}</p>
                  <p>Di Tempat</p>
                </>
              )}
              {activeType === "cuti-sekolah" && (
                <>
                  <p className="font-bold">{kepalaSekolahTujuan}</p>
                  <p className="font-semibold">{namaSekolah}</p>
                  <p>Di Tempat</p>
                </>
              )}
              {activeType === "keterangan" && (
                <>
                  <p className="font-bold">Pihak Terkait / Yang Berkepentingan</p>
                  <p>Di Tempat</p>
                </>
              )}
              {activeType === "tugas" && (
                <>
                  <p className="font-bold">Seluruh Instansi & Pihak Terkait (Bandara, Imigrasi, Hotel & Maskapai)</p>
                  <p>Di Tempat</p>
                </>
              )}
              {activeType === "klaim-asuransi" && (
                <>
                  <p className="font-bold">Departemen Klaim Asuransi Perjalanan</p>
                  <p className="font-semibold">{namaAsuransi}</p>
                  <p>Di Tempat</p>
                </>
              )}
            </div>

            {/* ── SALAM PEMBUKA ─────────────────────────────── */}
            <div className="mb-3">
              <p className="italic font-medium">Assalamu&apos;alaikum Warahmatullahi Wabarakatuh,</p>
            </div>

            {/* ── PARAGRAF PENGANTAR ────────────────────────── */}
            <div className="mb-4 text-justify">
              {activeType === "rekom" && (
                <p>
                  Bersama surat ini, kami dari PT. Visi Tour Utama (VTU Abadi) selaku Penyelenggara Perjalanan Ibadah Umrah (PPIU) dengan Izin Resmi Kementerian Agama Republik Indonesia, menerangkan dengan sebenarnya bahwa:
                </p>
              )}
              {activeType === "cuti-pekerja" && (
                <p>
                  Dengan hormat, kami dari PT. Visi Tour Utama (VTU Abadi) selaku biro perjalanan ibadah umrah resmi menerangkan bahwa karyawan dari instansi/perusahaan Bapak/Ibu berikut ini:
                </p>
              )}
              {activeType === "cuti-sekolah" && (
                <p>
                  Dengan hormat, kami dari PT. Visi Tour Utama (VTU Abadi) mengonfirmasikan bahwa siswa/mahasiswa yang terdaftar di lembaga pendidikan Bapak/Ibu:
                </p>
              )}
              {activeType === "keterangan" && (
                <p>
                  Yang bertanda tangan di bawah ini, Direktur Operasional PT. Visi Tour Utama (VTU Abadi) menerangkan dengan sesungguhnya bahwa nama di bawah ini:
                </p>
              )}
              {activeType === "tugas" && (
                <p>
                  Guna memastikan kelancaran, keamanan, dan kekhusyukan pelayanan ibadah jamaah rombongan umroh PT. Visi Tour Utama (VTU Abadi), dengan ini Direksi memberikan mandat dan tugas kepada:
                </p>
              )}
              {activeType === "klaim-asuransi" && (
                <p>
                  Dengan hormat, bersama ini kami dari PT. Visi Tour Utama (VTU Abadi) mengajukan permohonan pengantar klaim asuransi perjalanan ibadah umroh atas nama jamaah kami:
                </p>
              )}
            </div>

            {/* ── TABEL BIODATA INDENTED ────────────────────── */}
            <div className="my-4 ml-6 mr-4 bg-stone-50/60 p-3 rounded-lg border border-stone-200/80 font-sans text-[12px]">
              <table className="w-full text-left">
                <tbody>
                  <tr>
                    <td className="py-1 w-44 font-medium text-stone-700">Nama Lengkap</td>
                    <td className="py-1 w-4">:</td>
                    <td className="py-1 font-bold text-stone-950 uppercase">{namaLengkap || "..................................................."}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-medium text-stone-700">NIK (No. KTP)</td>
                    <td className="py-1">:</td>
                    <td className="py-1 font-mono">{nik || "-"}</td>
                  </tr>
                  {nomorPaspor && (
                    <tr>
                      <td className="py-1 font-medium text-stone-700">Nomor Paspor</td>
                      <td className="py-1">:</td>
                      <td className="py-1 font-mono font-bold text-stone-900">{nomorPaspor}</td>
                    </tr>
                  )}
                  {tempatLahir && (
                    <tr>
                      <td className="py-1 font-medium text-stone-700">Tempat, Tanggal Lahir</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{tempatLahir}, {tanggalLahir}</td>
                    </tr>
                  )}
                  {jenisKelamin && activeType !== "tugas" && (
                    <tr>
                      <td className="py-1 font-medium text-stone-700">Jenis Kelamin</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{jenisKelamin}</td>
                    </tr>
                  )}
                  {activeType === "cuti-pekerja" && (
                    <>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">NIP / ID Karyawan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-mono">{nipKaryawan}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Jabatan / Posisi</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-semibold">{jabatanKaryawan}</td>
                      </tr>
                    </>
                  )}
                  {activeType === "cuti-sekolah" && (
                    <>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">NISN / NIM</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-mono">{nisnSiswa}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Kelas / Jurusan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-semibold">{kelasSiswa}</td>
                      </tr>
                      {namaWali && (
                        <tr>
                          <td className="py-1 font-medium text-stone-700">Nama Orang Tua / Wali</td>
                          <td className="py-1">:</td>
                          <td className="py-1">{namaWali}</td>
                        </tr>
                      )}
                    </>
                  )}
                  {activeType === "tugas" && (
                    <>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Penugasan / Jabatan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-bold text-emerald-800">{peranPetugas}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Kontak WhatsApp</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-mono">{noKontakPetugas}</td>
                      </tr>
                    </>
                  )}
                  {activeType === "klaim-asuransi" && (
                    <>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Nomor Polis Asuransi</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-mono font-bold">{nomorPolis}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Jenis Klaim Diajukan</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-semibold text-rose-800">{jenisKlaim}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium text-stone-700">Estimasi Nilai Klaim</td>
                        <td className="py-1">:</td>
                        <td className="py-1 font-bold text-stone-900">{nilaiKlaim}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="py-1 font-medium text-stone-700">Alamat Lengkap</td>
                    <td className="py-1">:</td>
                    <td className="py-1">{alamat || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── DETAIL KEBERANGKATAN / TUJUAN ─────────────── */}
            <div className="mb-4 text-justify">
              {activeType === "rekom" && (
                <p>
                  Adalah benar calon jamaah kami yang telah terdaftar resmi pada program keberangkatan <strong>{namaPaket}</strong> ({durasiHari}) dengan jadwal keberangkatan Insya Allah pada tanggal <strong>{tanggalBerangkat}</strong> sampai dengan <strong>{tanggalPulang}</strong> menggunakan maskapai <strong>{maskapai}</strong>.
                </p>
              )}
              {activeType === "cuti-pekerja" && (
                <p>
                  Akan melaksanakan rangkaian ibadah Umroh ke Tanah Suci (Makkah dan Madinah) bersama rombongan PT. Visi Tour Utama pada tanggal <strong>{tanggalBerangkat}</strong> sampai dengan <strong>{tanggalPulang}</strong> ({durasiHari}).
                </p>
              )}
              {activeType === "cuti-sekolah" && (
                <p>
                  Akan melaksanakan Ibadah Umroh ke Tanah Suci mendampingi orang tua/keluarga pada tanggal <strong>{tanggalBerangkat}</strong> sampai dengan <strong>{tanggalPulang}</strong> ({durasiHari}) bersama PT. Visi Tour Utama.
                </p>
              )}
              {activeType === "keterangan" && (
                <p>
                  Telah terdaftar resmi dan terverifikasi secara sah pada paket ibadah <strong>{namaPaket}</strong> dengan status <em>{statusBooking}</em>, dijadwalkan terbang pada <strong>{tanggalBerangkat}</strong> s.d. <strong>{tanggalPulang}</strong> dengan akomodasi Hotel Makkah: <strong>{hotelMakkah}</strong> dan Hotel Madinah: <strong>{hotelMadinah}</strong>.
                </p>
              )}
              {activeType === "tugas" && (
                <div className="space-y-2">
                  <p>
                    Ditugaskan untuk mendampingi dan memimpin rombongan <strong>{jumlahJamaah}</strong> pada paket <strong>{namaPaket}</strong>, tanggal <strong>{tanggalBerangkat}</strong> s.d. <strong>{tanggalPulang}</strong>.
                  </p>
                  <p className="text-[12px] bg-stone-50 p-2.5 rounded border border-stone-200">
                    <strong>Lingkup Tanggung Jawab & Tugas:</strong> {lingkupTugas}
                  </p>
                </div>
              )}
              {activeType === "klaim-asuransi" && (
                <div className="space-y-2">
                  <p>
                    Mengalami insiden/gangguan kesehatan saat mengikuti rangkaian program ibadah umroh paket <strong>{namaPaket}</strong> di Tanah Suci dengan kronologi sebagai berikut:
                  </p>
                  <p className="text-[12px] bg-stone-50 p-2.5 rounded border border-stone-200">
                    <strong>Kronologi Kejadian:</strong> {kronologiSingkat}
                  </p>
                </div>
              )}
            </div>

            {/* ── PARAGRAF PERMOHONAN & PENUTUP ─────────────── */}
            <div className="mb-6 text-justify">
              {activeType === "rekom" && (
                <p>
                  Sehubungan dengan hal tersebut di atas, kami memohon kiranya Bapak/Ibu Kepala Kantor Imigrasi berkenan memberikan bantuan dan rekomendasi dalam proses pembuatan/penggantian paspor RI atas nama yang bersangkutan guna kelengkapan dokumen ibadah ke Arab Saudi.
                </p>
              )}
              {activeType === "cuti-pekerja" && (
                <p>
                  Sehubungan dengan pelaksanaan ibadah tersebut, kami memohon kebijakan Bapak/Ibu Pimpinan untuk dapat memberikan izin / cuti dinas/kerja selama periode tanggal tersebut di atas.
                </p>
              )}
              {activeType === "cuti-sekolah" && (
                <p>
                  Sehubungan dengan hal tersebut, kami memohon kiranya Bapak/Ibu Kepala Sekolah / Dewan Guru berkenan memberikan izin dispensasi belajar bagi siswa/mahasiswa tersebut selama periode ibadah berlangsung.
                </p>
              )}
              {activeType === "keterangan" && (
                <p>
                  Surat keterangan ini dibuat dengan sebenarnya atas permohonan yang bersangkutan untuk keperluan <strong>{keperluanKeterangan}</strong> dan agar dapat dipergunakan sebagaimana mestinya.
                </p>
              )}
              {activeType === "tugas" && (
                <p>
                  Demikian surat perintah tugas ini dibuat agar dapat dilaksanakan dengan sebaik-baiknya dan penuh rasa amanah, serta mohon kepada pihak-pihak terkait dapat memberikan bantuan demi kelancaran tugas tersebut.
                </p>
              )}
              {activeType === "klaim-asuransi" && (
                <p>
                  Bersama surat ini kami lampirkan dokumen pendukung (Resume Medis RS, Kwitansi Pembayaran, Boarding Pass, dan Salinan Paspor & Visa) untuk diproses pencairannya sesuai ketentuan polis yang berlaku.
                </p>
              )}

              <p className="mt-3">
                Demikian surat ini kami sampaikan. Atas perhatian, kerja sama, dan bantuan yang diberikan, kami ucapkan terima kasih.
              </p>
            </div>

            <div className="mb-8">
              <p className="italic font-medium">Wassalamu&apos;alaikum Warahmatullahi Wabarakatuh,</p>
            </div>

            {/* ── TANDA TANGAN & STEMPEL RESMI ─────────────── */}
            <div className="flex justify-end font-sans text-[12px] break-inside-avoid">
              <div className="text-center w-72">
                <p className="font-semibold text-stone-800">PT. VISI TOUR UTAMA</p>
                <p className="text-[11px] text-stone-500 mb-14">Direktorat Operasional & Pelayanan Jamaah</p>

                {/* Stempel Visual Overlay */}
                <div className="relative inline-block">
                  <div className="absolute -top-12 -left-8 transform -rotate-12 border-2 border-emerald-700/60 rounded-full px-3 py-1 text-[10px] font-bold text-emerald-800 uppercase tracking-widest pointer-events-none select-none opacity-85">
                    PT. VISI TOUR UTAMA<br />
                    ★ RESMI PPIU ★
                  </div>
                </div>

                <p className="font-bold underline text-stone-950 text-[13px]">{namaPenandatangan}</p>
                <p className="text-stone-600 text-[11px]">{jabatanPenandatangan}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
