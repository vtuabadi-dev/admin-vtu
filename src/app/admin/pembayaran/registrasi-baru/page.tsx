"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/Card";
import {
  Badge,
  Button,
  Modal,
} from "@/shared/components/ui";
import { formatDate } from "@/shared/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { LoadingSkeleton } from "@/shared/components/LoadingSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import type { RegistrationRequest } from "@/shared/types";

const STATUS_TABS: { value: string; label: string; color: string }[] = [
  { value: "", label: "Semua", color: "bg-gray-100 text-gray-700" },
  { value: "PENDING_REVIEW", label: "Menunggu Review", color: "bg-yellow-100 text-yellow-700" },
  { value: "APPROVED", label: "Disetujui", color: "bg-green-100 text-green-700" },
  { value: "ACCOUNT_CREATED", label: "Akun Dibuat", color: "bg-blue-100 text-blue-700" },
  { value: "REJECTED", label: "Ditolak", color: "bg-red-100 text-red-700" },
];

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ACCOUNT_CREATED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-200 text-gray-500",
  EXPIRED: "bg-gray-200 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Menunggu Review",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  ACCOUNT_CREATED: "Akun Dibuat",
  ACTIVE: "Aktif",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kadaluarsa",
};

export default function RegistrasiBaruPage() {
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("status") ?? "");
  const [detailTarget, setDetailTarget] = useState<RegistrationRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RegistrationRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [accounts, setAccounts] = useState<
    { namaLengkap: string; username: string; tempPassword: string }[] | null
  >(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set("status", activeTab);
      const res = await fetch(`/api/admin/registrations?${params}`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/registrations/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Registrasi berhasil disetujui" });
        setAccounts(data.data.accounts ?? null);
        loadData();
      } else {
        setResult({ type: "error", message: data.message });
      }
    } catch {
      setResult({ type: "error", message: "Terjadi kesalahan" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/registrations/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatanAdmin: rejectNotes || "Ditolak oleh admin" }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Registrasi ditolak" });
        setRejectTarget(null);
        setRejectNotes("");
        loadData();
      } else {
        setResult({ type: "error", message: data.message });
      }
    } catch {
      setResult({ type: "error", message: "Terjadi kesalahan" });
    } finally {
      setProcessingId(null);
    }
  };

  const openDetail = (req: RegistrationRequest) => {
    setDetailTarget(req);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Registrasi Baru</h1>
        <p className="text-sm text-gray-500 mt-1">Review & approval permohonan registrasi grup jamaah</p>
      </div>

      {/* Result notification */}
      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
          ) : (
            <XCircle className="w-4 h-4 inline mr-1" />
          )}
          {result.message}
          {result.type === "success" && (
            <button
              onClick={() => setResult(null)}
              className="ml-2 text-green-600 hover:text-green-800 underline text-xs"
            >
              Tutup
            </button>
          )}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : requests.length === 0 ? (
        <EmptyState
          title="Tidak ada permohonan registrasi"
          description={activeTab ? `Belum ada registrasi dengan status ${STATUS_LABEL[activeTab] ?? activeTab}` : "Belum ada permohonan registrasi baru"}
        />
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{req.kodeRegistrasi}</h3>
                      <Badge className={STATUS_COLOR[req.status] ?? "bg-gray-100"}>
                        {STATUS_LABEL[req.status] ?? req.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Perwakilan:</span>{" "}
                        <span className="text-gray-900 font-medium uppercase">{req.namaPerwakilan}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Telepon:</span>{" "}
                        <span className="text-gray-900">{req.nomorTelepon}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">PAX:</span>{" "}
                        <span className="text-gray-900 font-medium">{req.paxCount} orang</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tanggal:</span>{" "}
                        <span className="text-gray-900">{formatDate(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(req)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detail
                    </Button>
                    {req.status === "PENDING_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={processingId === req.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                          )}
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectTarget(req)}
                          disabled={processingId === req.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Detail Registrasi">
        {detailTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLOR[detailTarget.status] ?? "bg-gray-100"}>
                {STATUS_LABEL[detailTarget.status] ?? detailTarget.status}
              </Badge>
              <span className="text-sm font-mono text-gray-500">{detailTarget.kodeRegistrasi}</span>
            </div>

            {/* Representative */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Data Perwakilan</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Nama:</span> {detailTarget.namaPerwakilan}</p>
                <p><span className="text-gray-500">Telepon:</span> {detailTarget.nomorTelepon}</p>
                <p><span className="text-gray-500">Email:</span> {detailTarget.emailPerwakilan}</p>
                <p><span className="text-gray-500">PAX:</span> {detailTarget.paxCount} orang</p>
              </div>
            </div>

            {/* Members */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Anggota Rombongan</h4>
              <div className="bg-gray-50 rounded-lg divide-y">
                {detailTarget.members.map((m, i) => (
                  <div key={m.id || i} className="flex items-center gap-3 p-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                      {m.urutan}
                    </span>
                    <span className="text-gray-900 font-medium uppercase flex-1">{m.namaLengkap}</span>
                    <span className="text-gray-400">{m.jenisKelamin}</span>
                    {m.hubungan && <span className="text-gray-400 text-xs">({m.hubungan})</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Package info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Paket & Upgrade</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Paket ID:</span> {detailTarget.paketId}</p>
                {detailTarget.roomUpgrade && <p><span className="text-gray-500">Room:</span> {detailTarget.roomUpgrade}</p>}
                {detailTarget.hotelUpgrade && <p><span className="text-gray-500">Hotel:</span> {detailTarget.hotelUpgrade}</p>}
                <p><span className="text-gray-500">Syarat:</span> {detailTarget.termsAccepted ? "Disetujui" : "Belum"}</p>
              </div>
            </div>

            {/* Catatan admin */}
            {detailTarget.catatanAdmin && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Catatan Admin</h4>
                <p className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3">{detailTarget.catatanAdmin}</p>
              </div>
            )}

            {/* Signature */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Tanda Tangan</h4>
              <p className="text-xs text-gray-400 font-mono">{detailTarget.signaturePath}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectNotes(""); }}
        title="Tolak Registrasi"
      >
        {rejectTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Tolak permohonan <span className="font-mono font-medium">{rejectTarget.kodeRegistrasi}</span> dari{" "}
              <span className="font-medium uppercase">{rejectTarget.namaPerwakilan}</span>?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Penolakan</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Tulis alasan penolakan..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNotes(""); }}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId === rejectTarget.id}
              >
                {processingId === rejectTarget.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Tolak
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Accounts Modal (after approve) */}
      <Modal
        open={!!accounts}
        onClose={() => setAccounts(null)}
        title="Akun Jamaah Dibuat"
      >
        {accounts && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              {accounts.length} akun jamaah berhasil dibuat. Simpan informasi berikut:
            </div>
            <div className="bg-gray-50 rounded-lg divide-y max-h-64 overflow-y-auto">
              {accounts.map((acc, i) => (
                <div key={i} className="p-3 text-sm">
                  <p className="font-medium text-gray-900 uppercase">{acc.namaLengkap}</p>
                  <p className="text-gray-500">Username: <span className="font-mono text-gray-700">{acc.username}</span></p>
                  <p className="text-gray-500">Password: <span className="font-mono text-gray-700">{acc.tempPassword}</span></p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Salin dan berikan username & password kepada masing-masing jamaah. Password wajib diubah saat login pertama.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setAccounts(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
