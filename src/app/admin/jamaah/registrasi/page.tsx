"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  CreditCard,
  Plane,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/utils";
import {
  getKeberangkatanList,
  submitRegistrasi,
} from "@/server/actions/api";
import type {
  RegistrasiFormData,
  Keberangkatan,
  JenisKelamin,
} from "@/shared/types";

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const INITIAL_FORM_DATA: RegistrasiFormData = {
  namaLengkap: "",
  namaAyah: "",
  jenisKelamin: "" as JenisKelamin,
  tempatLahir: "",
  tanggalLahir: "",
  nik: "",
  nomorPaspor: "",
  masaBerlakuPaspor: "",
  nomorTelepon: "",
  email: "",
  alamat: "",
  provinsi: "",
  kota: "",
  kecamatan: "",
  kelurahan: "",
  paketKeberangkatanId: "",
  namaGroup: "",
  tandaTanganDigital: "",
  syaratDisetujui: false,
};

const STEP_LABELS = ["Data Diri", "Paket", "Tanda Tangan", "Konfirmasi"];

type FormErrors = Partial<Record<keyof RegistrasiFormData, string>>;

function validateStep(step: number, data: RegistrasiFormData): FormErrors {
  const errs: FormErrors = {};

  if (step === 1) {
    if (!data.namaLengkap.trim()) errs.namaLengkap = "Nama lengkap wajib diisi";
    if (!data.namaAyah.trim()) errs.namaAyah = "Nama ayah wajib diisi";
    if (!data.jenisKelamin) errs.jenisKelamin = "Jenis kelamin wajib dipilih";
    if (!data.tempatLahir.trim()) errs.tempatLahir = "Tempat lahir wajib diisi";
    if (!data.tanggalLahir) errs.tanggalLahir = "Tanggal lahir wajib diisi";
    if (!data.nik.trim()) {
      errs.nik = "NIK wajib diisi";
    } else if (!/^\d{16}$/.test(data.nik)) {
      errs.nik = "NIK harus 16 digit angka";
    }
    if (!data.nomorPaspor.trim()) errs.nomorPaspor = "Nomor paspor wajib diisi";
    if (!data.masaBerlakuPaspor)
      errs.masaBerlakuPaspor = "Masa berlaku paspor wajib diisi";
    if (!data.nomorTelepon.trim())
      errs.nomorTelepon = "Nomor telepon wajib diisi";
    if (!data.email.trim()) {
      errs.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errs.email = "Format email tidak valid";
    }
    if (!data.alamat.trim()) errs.alamat = "Alamat wajib diisi";
    if (!data.provinsi.trim()) errs.provinsi = "Provinsi wajib diisi";
    if (!data.kota.trim()) errs.kota = "Kota wajib diisi";
    if (!data.kecamatan.trim()) errs.kecamatan = "Kecamatan wajib diisi";
    if (!data.kelurahan.trim()) errs.kelurahan = "Kelurahan wajib diisi";
  }

  if (step === 2) {
    if (!data.paketKeberangkatanId)
      errs.paketKeberangkatanId = "Pilih paket keberangkatan";
  }

  if (step === 3) {
    if (!data.syaratDisetujui)
      errs.syaratDisetujui =
        "Anda harus menyetujui syarat dan ketentuan";
    if (!data.tandaTanganDigital)
      errs.tandaTanganDigital = "Tanda tangan digital wajib diisi";
  }

  return errs;
}

function formatLocaleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// LEAD MANAGEMENT PANEL
// ============================================================

function LeadManagementPanel() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/registrations?${params}`);
      const data = await res.json();
      if (data.success) setLeads(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoadingLeads(false);
    }
  }, [statusFilter]);

  const leadStatuses = ["BARU", "DIHUBUNGI", "FOLLOW_UP", "MENUNGGU_DP", "DP_MASUK"];

  const getActionsForLeadStatus = (lStatus: string): { label: string; nextStatus: string; variant: string }[] => {
    const map: Record<string, { label: string; nextStatus: string; variant: string }[]> = {
      BARU: [
        { label: "Hubungi", nextStatus: "DIHUBUNGI", variant: "bg-blue-600 hover:bg-blue-700" },
        { label: "Tolak", nextStatus: "DITOLAK", variant: "bg-red-500 hover:bg-red-600" },
      ],
      DIHUBUNGI: [
        { label: "Follow Up", nextStatus: "FOLLOW_UP", variant: "bg-indigo-600 hover:bg-indigo-700" },
        { label: "Menunggu DP", nextStatus: "MENUNGGU_DP", variant: "bg-amber-500 hover:bg-amber-600" },
        { label: "Tolak", nextStatus: "DITOLAK", variant: "bg-red-500 hover:bg-red-600" },
      ],
      FOLLOW_UP: [
        { label: "Menunggu DP", nextStatus: "MENUNGGU_DP", variant: "bg-amber-500 hover:bg-amber-600" },
        { label: "Hubungi Lagi", nextStatus: "DIHUBUNGI", variant: "bg-blue-600 hover:bg-blue-700" },
        { label: "Tolak", nextStatus: "DITOLAK", variant: "bg-red-500 hover:bg-red-600" },
      ],
      MENUNGGU_DP: [
        { label: "DP Masuk", nextStatus: "DP_MASUK", variant: "bg-green-600 hover:bg-green-700" },
        { label: "Hubungi", nextStatus: "DIHUBUNGI", variant: "bg-blue-600 hover:bg-blue-700" },
        { label: "Tolak", nextStatus: "DITOLAK", variant: "bg-red-500 hover:bg-red-600" },
      ],
      DP_MASUK: [
        { label: "Konversi", nextStatus: "DIKONVERSI", variant: "bg-green-600 hover:bg-green-700" },
        { label: "Tolak", nextStatus: "DITOLAK", variant: "bg-red-500 hover:bg-red-600" },
      ],
    };
    return map[lStatus] ?? [];
  };

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStatusChange = async (id: string, newLeadStatus: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadStatus: newLeadStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => l.id === id ? { ...l, leadStatus: newLeadStatus } : l));
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  // allStatuses for filter dropdown — declared once in panel scope
  const allStatuses = [...leadStatuses, "PENDING_REVIEW", "APPROVED", "REJECTED"];

  const STATUS_COLORS: Record<string, string> = {
    BARU: "bg-purple-100 text-purple-800", DIHUBUNGI: "bg-blue-100 text-blue-800",
    FOLLOW_UP: "bg-indigo-100 text-indigo-800", MENUNGGU_DP: "bg-amber-100 text-amber-800",
    DP_MASUK: "bg-green-100 text-green-800", PENDING_REVIEW: "bg-cyan-100 text-cyan-800",
    APPROVED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-600",
  };

  const STATUS_LABELS: Record<string, string> = {
    BARU: "Baru", DIHUBUNGI: "Dihubungi", FOLLOW_UP: "Follow Up",
    MENUNGGU_DP: "Menunggu DP", DP_MASUK: "DP Masuk", PENDING_REVIEW: "Review",
    APPROVED: "Disetujui", REJECTED: "Ditolak", CANCELLED: "Batal",
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Lead Registrasi ({leads.length})</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            {allStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>

        {loadingLeads ? (
          <p className="text-sm text-muted-foreground text-center py-4">Memuat...</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada lead registrasi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium text-xs text-gray-500">Kode</th>
                  <th className="py-2 pr-3 font-medium text-xs text-gray-500">Perwakilan</th>
                  <th className="py-2 pr-3 font-medium text-xs text-gray-500">PAX</th>
                  <th className="py-2 pr-3 font-medium text-xs text-gray-500">Status</th>
                  <th className="py-2 font-medium text-xs text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 20).map((lead: any) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-mono text-xs">{lead.kodeRegistrasi}</td>
                    <td className="py-2 pr-3">
                      <p className="font-medium">{lead.namaPerwakilan}</p>
                      <p className="text-xs text-gray-400">{lead.nomorTelepon}</p>
                    </td>
                    <td className="py-2 pr-3 text-xs">{lead.paxCount} org</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.leadStatus ?? "BARU"] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[lead.leadStatus ?? "BARU"] ?? (lead.leadStatus ?? "BARU")}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        {getActionsForLeadStatus(lead.leadStatus ?? "BARU").map((action) => (
                          <button
                            key={action.nextStatus}
                            type="button"
                            disabled={actionLoading === lead.id}
                            onClick={() => handleStatusChange(lead.id, action.nextStatus)}
                            className={`px-2 py-1 text-xs text-white rounded ${action.variant} disabled:opacity-50`}
                          >
                            {actionLoading === lead.id ? "..." : action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function RegistrasiPage() {
  const router = useRouter();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] =
    useState<RegistrasiFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});

  // Data state
  const [keberangkatanList, setKeberangkatanList] = useState<Keberangkatan[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    kodeRegistrasi: string;
  } | null>(null);

  // Load packages
  useEffect(() => {
    async function load() {
      try {
        const pkg = await getKeberangkatanList();
        setKeberangkatanList(pkg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Generic field updater
  const updateField = useCallback(
    <K extends keyof RegistrasiFormData>(
      key: K,
      value: RegistrasiFormData[K]
    ) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // Step navigation with validation
  const goForward = useCallback(() => {
    const errs = validateStep(currentStep, formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setCurrentStep((prev) => prev + 1);
  }, [currentStep, formData]);

  const goBack = useCallback(() => {
    setErrors({});
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    const errs = validateStep(3, formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await submitRegistrasi(formData);
      setSubmitResult(result);
      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  // Derived
  const selectedPaket = keberangkatanList.find(
    (p) => p.id === formData.paketKeberangkatanId
  );

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Registrasi Jamaah Baru
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola lead pendaftaran dan registrasi jamaah baru
        </p>
      </div>

      {/* Lead Management Panel */}
      <LeadManagementPanel />

      {/* Divider */}
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-muted-foreground mb-4">
          Registrasi Manual (Admin Entry)
        </p>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} />

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 1 && (
            <StepDataDiri
              formData={formData}
              errors={errors}
              updateField={updateField}
              onNext={goForward}
            />
          )}

          {currentStep === 2 && (
            <StepPaket
              formData={formData}
              errors={errors}
              updateField={updateField}
              keberangkatanList={keberangkatanList}
              selectedPaket={selectedPaket}
              onPrev={goBack}
              onNext={goForward}
            />
          )}

          {currentStep === 3 && (
            <StepTandaTangan
              formData={formData}
              errors={errors}
              updateField={updateField}
              onPrev={goBack}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}

          {currentStep === 4 && submitResult && (
            <StepKonfirmasi
              kodeRegistrasi={submitResult.kodeRegistrasi}
              formData={formData}
              selectedPaket={selectedPaket}
              onLihatDetail={() => router.push("/admin/jamaah")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// PROGRESS INDICATOR
// ============================================================

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-4">
      {STEP_LABELS.map((label, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                  isActive &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isCompleted && "bg-primary text-primary-foreground",
                  isFuture && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs mt-1.5 whitespace-nowrap",
                  isActive && "font-semibold text-primary",
                  isCompleted && "text-primary",
                  isFuture && "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>

            {index < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "w-10 sm:w-20 h-0.5 mx-1 sm:mx-2 mb-5",
                  stepNum <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// STEP 1 — DATA DIRI
// ============================================================

function StepDataDiri({
  formData,
  errors,
  updateField,
  onNext,
}: {
  formData: RegistrasiFormData;
  errors: FormErrors;
  updateField: <K extends keyof RegistrasiFormData>(
    key: K,
    value: RegistrasiFormData[K]
  ) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Section title */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Data Diri</h2>
      </div>

      {/* Personal info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="namaLengkap"
          label="Nama Lengkap"
          placeholder="Masukkan nama lengkap"
          value={formData.namaLengkap}
          onChange={(e) => updateField("namaLengkap", e.target.value)}
          error={errors.namaLengkap}
        />
        <Input
          id="namaAyah"
          label="Nama Ayah"
          placeholder="Masukkan nama ayah"
          value={formData.namaAyah}
          onChange={(e) => updateField("namaAyah", e.target.value)}
          error={errors.namaAyah}
        />
        <Select
          id="jenisKelamin"
          label="Jenis Kelamin"
          placeholder="Pilih jenis kelamin"
          options={[
            { value: "L", label: "Laki-laki" },
            { value: "P", label: "Perempuan" },
          ]}
          value={formData.jenisKelamin}
          onChange={(e) =>
            updateField("jenisKelamin", e.target.value as JenisKelamin)
          }
          error={errors.jenisKelamin}
        />
        <Input
          id="tempatLahir"
          label="Tempat Lahir"
          placeholder="Masukkan tempat lahir"
          value={formData.tempatLahir}
          onChange={(e) => updateField("tempatLahir", e.target.value)}
          error={errors.tempatLahir}
        />
        <Input
          id="tanggalLahir"
          label="Tanggal Lahir"
          type="date"
          value={formData.tanggalLahir}
          onChange={(e) => updateField("tanggalLahir", e.target.value)}
          error={errors.tanggalLahir}
        />
        <Input
          id="nik"
          label="NIK"
          placeholder="16 digit NIK"
          maxLength={16}
          value={formData.nik}
          onChange={(e) =>
            updateField("nik", e.target.value.replace(/\D/g, ""))
          }
          error={errors.nik}
        />
        <Input
          id="nomorPaspor"
          label="Nomor Paspor"
          placeholder="Masukkan nomor paspor"
          value={formData.nomorPaspor}
          onChange={(e) => updateField("nomorPaspor", e.target.value)}
          error={errors.nomorPaspor}
        />
        <Input
          id="masaBerlakuPaspor"
          label="Masa Berlaku Paspor"
          type="date"
          value={formData.masaBerlakuPaspor}
          onChange={(e) => updateField("masaBerlakuPaspor", e.target.value)}
          error={errors.masaBerlakuPaspor}
        />
        <Input
          id="nomorTelepon"
          label="Nomor Telepon"
          type="tel"
          placeholder="08xxxxxxxxxx"
          value={formData.nomorTelepon}
          onChange={(e) => updateField("nomorTelepon", e.target.value)}
          error={errors.nomorTelepon}
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="contoh@email.com"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          error={errors.email}
        />
      </div>

      {/* Alamat Section */}
      <div className="flex items-center gap-2 pb-1 border-b pt-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Alamat</h2>
      </div>

      <Input
        id="alamat"
        label="Alamat Lengkap"
        placeholder="Masukkan alamat lengkap (RT/RW, nama jalan, dusun)"
        value={formData.alamat}
        onChange={(e) => updateField("alamat", e.target.value)}
        error={errors.alamat}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="provinsi"
          label="Provinsi"
          placeholder="Masukkan provinsi"
          value={formData.provinsi}
          onChange={(e) => updateField("provinsi", e.target.value)}
          error={errors.provinsi}
        />
        <Input
          id="kota"
          label="Kota / Kabupaten"
          placeholder="Masukkan kota atau kabupaten"
          value={formData.kota}
          onChange={(e) => updateField("kota", e.target.value)}
          error={errors.kota}
        />
        <Input
          id="kecamatan"
          label="Kecamatan"
          placeholder="Masukkan kecamatan"
          value={formData.kecamatan}
          onChange={(e) => updateField("kecamatan", e.target.value)}
          error={errors.kecamatan}
        />
        <Input
          id="kelurahan"
          label="Kelurahan / Desa"
          placeholder="Masukkan kelurahan atau desa"
          value={formData.kelurahan}
          onChange={(e) => updateField("kelurahan", e.target.value)}
          error={errors.kelurahan}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext}>
          Selanjutnya
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2 — PAKET KEBERANGKATAN
// ============================================================

function StepPaket({
  formData,
  errors,
  updateField,
  keberangkatanList,
  selectedPaket,
  onPrev,
  onNext,
}: {
  formData: RegistrasiFormData;
  errors: FormErrors;
  updateField: <K extends keyof RegistrasiFormData>(
    key: K,
    value: RegistrasiFormData[K]
  ) => void;
  keberangkatanList: Keberangkatan[];
  selectedPaket: Keberangkatan | undefined;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Section title */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <Plane className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Pilih Paket Keberangkatan</h2>
      </div>

      {errors.paketKeberangkatanId && (
        <p className="text-sm text-destructive">
          {errors.paketKeberangkatanId}
        </p>
      )}

      {/* Package cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keberangkatanList.map((paket) => {
          const isSelected = selectedPaket?.id === paket.id;
          return (
            <Card
              key={paket.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => updateField("paketKeberangkatanId", paket.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {paket.paketUmroh?.namaPaket || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(paket.paketUmroh?.hargaBase || 0)} per orang
                    </p>
                  </div>
                  {isSelected && (
                    <Badge variant="default" size="sm">
                      <Check className="h-3 w-3 mr-1" />
                      Dipilih
                    </Badge>
                  )}
                </div>

                <p className="text-lg font-bold text-primary">
                  {formatCurrency(paket.paketUmroh?.hargaBase || 0)}
                </p>

                <div className="text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Plane className="h-3.5 w-3.5 shrink-0" />
                    <span>{paket.maskapaiId || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {formatLocaleDate(paket.tanggalBerangkat)} &mdash;{" "}
                      {formatLocaleDate(paket.tanggalPulang)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Hotel Mekkah: {paket.hotelMekkahId || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Hotel Madinah: {paket.hotelMadinahId || "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Nama Group */}
      <div className="pt-4 border-t">
        <Input
          id="namaGroup"
          label="Nama Group / Rombongan"
          placeholder="Contoh: Keluarga Besar Ahmad"
          value={formData.namaGroup}
          onChange={(e) => updateField("namaGroup", e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Nama grup untuk rombongan (contoh: Keluarga, Kantor, atau nama group
          lainnya)
        </p>
      </div>

      {/* Harga info */}
      {selectedPaket && (
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Harga per orang</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(selectedPaket.paketUmroh?.hargaBase || 0)}
            </p>
          </div>
          <Badge variant="info" size="lg">
            <CreditCard className="h-4 w-4 mr-1" />
            Belum Termasuk Pajak
          </Badge>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Sebelumnya
        </Button>
        <Button onClick={onNext}>
          Selanjutnya
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Inline calendar icon (CalendarDays not in the lucide-react import list)
function CalendarDaysIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ============================================================
// STEP 3 — TANDA TANGAN & PERSETUJUAN
// ============================================================

function StepTandaTangan({
  formData,
  errors,
  updateField,
  onPrev,
  onSubmit,
  isSubmitting,
}: {
  formData: RegistrasiFormData;
  errors: FormErrors;
  updateField: <K extends keyof RegistrasiFormData>(
    key: K,
    value: RegistrasiFormData[K]
  ) => void;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Section title */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">
          Syarat, Ketentuan &amp; Tanda Tangan
        </h2>
      </div>

      {/* Terms & Conditions */}
      <div>
        <p className="text-sm font-medium mb-2">Syarat dan Ketentuan</p>
        <div className="bg-muted/30 rounded-lg border p-4 max-h-44 overflow-y-auto text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">
            SYARAT DAN KETENTUAN TRAVEL UMROH/HAJI
          </p>
          <p>
            1. Calon jamaah wajib memiliki paspor yang masih berlaku minimal 12
            bulan sejak tanggal keberangkatan.
          </p>
          <p>
            2. Calon jamaah wajib melengkapi semua dokumen persyaratan yang
            telah ditentukan, termasuk namun tidak terbatas pada: KTP, Kartu
            Keluarga, Akta Kelahiran, Pas Foto, dan Buku Vaksin.
          </p>
          <p>
            3. Pembayaran biaya perjalanan dilakukan sesuai dengan ketentuan
            yang tertera pada invoice dan jadwal pelunasan yang telah disepakati.
          </p>
          <p>
            4. Pembatalan keberangkatan oleh pihak jamaah dikenakan biaya
            pembatalan sesuai dengan ketentuan yang berlaku dari maskapai dan
            hotel.
          </p>
          <p>
            5. Calon jamaah menyatakan bahwa data yang diisi adalah benar dan
            dapat dipertanggungjawabkan secara hukum.
          </p>
          <p>
            6. Pihak travel berhak membatalkan pendaftaran apabila ditemukan
            data yang tidak sesuai atau persyaratan yang tidak terpenuhi.
          </p>
          <p>
            7. Calon jamaah memahami bahwa jadwal keberangkatan dapat berubah
            sewaktu-waktu sesuai dengan kebijakan pemerintah Arab Saudi dan
            maskapai penerbangan.
          </p>
          <p>
            8. Dengan menandatangani, calon jamaah menyetujui seluruh ketentuan
            yang berlaku dan mengikat secara hukum.
          </p>
        </div>
      </div>

      {/* Agreement checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          checked={formData.syaratDisetujui}
          onChange={(e) => updateField("syaratDisetujui", e.target.checked)}
        />
        <span className="text-sm">
          Saya menyetujui syarat dan ketentuan yang berlaku
        </span>
      </label>
      {errors.syaratDisetujui && (
        <p className="text-xs text-destructive -mt-4 ml-7">
          {errors.syaratDisetujui}
        </p>
      )}

      {/* Digital Signature */}
      <SignaturePad
        value={formData.tandaTanganDigital}
        onChange={(dataUrl) => updateField("tandaTanganDigital", dataUrl)}
        error={errors.tandaTanganDigital}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Sebelumnya
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Mengirim..." : "Submit Pendaftaran"}
          {!isSubmitting && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// SIGNATURE PAD (self-contained canvas component)
// ============================================================

function SignaturePad({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasSignature = value.length > 0;

  // Resize canvas to fill container on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.width === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth || 500;
        canvas.height = 200;
      }
    }
  }, []);

  const getCanvasPos = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      if (!pos) return;
      setIsDrawing(true);
      lastPoint.current = pos;
    },
    [getCanvasPos]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing) return;
      const pos = getCanvasPos(e);
      if (!pos || !lastPoint.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      lastPoint.current = pos;
    },
    [isDrawing, getCanvasPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl);
    }
  }, [isDrawing, onChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    onChange("");
    lastPoint.current = null;
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Tanda Tangan Digital</label>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg overflow-hidden",
          hasSignature ? "border-primary" : "border-muted-foreground/30",
          error && "border-destructive"
        )}
      >
        <canvas
          ref={(node) => {
            if (node) {
              (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
            }
          }}
          width={500}
          height={200}
          className="w-full h-40 touch-none cursor-crosshair bg-white"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-center text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-1 opacity-40" />
              <p className="text-sm">Klik dan seret untuk tanda tangan</p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {hasSignature
            ? "Tanda tangan sudah ditambahkan"
            : "Gunakan mouse atau sentuhan untuk menandatangani"}
        </p>
        {hasSignature && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            type="button"
          >
            Hapus Tanda Tangan
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STEP 4 — KONFIRMASI
// ============================================================

function StepKonfirmasi({
  kodeRegistrasi,
  formData,
  selectedPaket,
  onLihatDetail,
}: {
  kodeRegistrasi: string;
  formData: RegistrasiFormData;
  selectedPaket: Keberangkatan | undefined;
  onLihatDetail: () => void;
}) {
  return (
    <div className="space-y-6 text-center">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Pendaftaran Berhasil!</h2>
        <p className="text-muted-foreground mt-1">
          Data jamaah berhasil didaftarkan ke dalam sistem
        </p>
      </div>

      {/* Registration Code */}
      <div className="bg-primary/5 rounded-lg border border-primary/10 p-4 inline-block">
        <p className="text-sm text-muted-foreground">Kode Registrasi</p>
        <p className="text-xl font-bold text-primary font-mono tracking-wider">
          {kodeRegistrasi}
        </p>
      </div>

      {/* Summary */}
      <div className="text-left bg-muted/30 rounded-lg border p-5 space-y-3">
        <p className="font-semibold text-sm">Ringkasan Data Pendaftaran</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          <SummaryItem label="Nama Lengkap" value={formData.namaLengkap} />
          <SummaryItem label="NIK" value={formData.nik} />
          <SummaryItem label="Nomor Paspor" value={formData.nomorPaspor} />
          <SummaryItem
            label="Jenis Kelamin"
            value={formData.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
          />
          <SummaryItem
            label="Tempat / Tgl Lahir"
            value={`${formData.tempatLahir}, ${formData.tanggalLahir}`}
            colSpan={true}
          />
          <SummaryItem label="Nomor Telepon" value={formData.nomorTelepon} />
          <SummaryItem label="Email" value={formData.email} />
          <SummaryItem
            label="Alamat"
            value={`${formData.alamat}, ${formData.kota}, ${formData.provinsi}`}
            colSpan={true}
          />
          {selectedPaket && (
            <>
              <SummaryItem
                label="Paket Keberangkatan"
                value={selectedPaket.paketUmroh?.namaPaket || "-"}
              />
              <SummaryItem
                label="Harga Paket"
                value={formatCurrency(selectedPaket.paketUmroh?.hargaBase || 0)}
              />
            </>
          )}
          {formData.namaGroup && (
            <SummaryItem label="Nama Group" value={formData.namaGroup} />
          )}
        </div>
      </div>

      {/* Action */}
      <div className="pt-2">
        <Button onClick={onLihatDetail} size="lg">
          Lihat Detail Jamaah
        </Button>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div className={cn(colSpan && "sm:col-span-2")}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
