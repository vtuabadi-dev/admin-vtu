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
import { resolveDocumentImageUrl } from "@/shared/lib/document-utils";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Trash2,
  AlertTriangle,
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
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/registrations${activeTab ? `?status=${activeTab}` : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setShowDeleteAllModal(false);
        setResult({ type: "success", message: `Berhasil menghapus ${data.count} riwayat pendaftaran.` });
        loadData();
      } else {
        setResult({ type: "error", message: data.message || "Gagal menghapus riwayat pendaftaran" });
      }
    } catch {
      setResult({ type: "error", message: "Terjadi kesalahan saat menghapus data" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/registrations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        setResult({ type: "success", message: `Riwayat pendaftaran ${deleteTarget.kodeRegistrasi} berhasil dihapus.` });
        loadData();
      } else {
        setResult({ type: "error", message: data.message || "Gagal menghapus riwayat pendaftaran" });
      }
    } catch {
      setResult({ type: "error", message: "Terjadi kesalahan saat menghapus data" });
    } finally {
      setIsDeleting(false);
    }
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registrasi Baru</h1>
          <p className="text-sm text-gray-500 mt-1">Review & approval permohonan registrasi grup jamaah</p>
        </div>

        {/* Tombol Hapus Seluruh Riwayat Pendaftaran */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteAllModal(true)}
          disabled={requests.length === 0 || isDeleting}
          className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hapus Semua Riwayat ({requests.length})</span>
        </Button>
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
                      <h3 className="font-semibold text-gray-900 font-mono">{req.kodeRegistrasi}</h3>
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

                    {/* Tombol Hapus Riwayat Pendaftaran Satuan */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(req)}
                      disabled={processingId === req.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Hapus riwayat pendaftaran ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Seluruh Riwayat */}
      <Modal
        open={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        title="Konfirmasi Hapus Seluruh Riwayat Pendaftaran"
        size="default"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-red-900">
                PERINGATAN: Tindakan ini bersifat PERMANEN dan tidak dapat dibatalkan!
              </p>
              <p className="text-red-700">
                Seluruh ({requests.length}) data riwayat pendaftaran jamaah{activeTab ? ` dengan status ${STATUS_LABEL[activeTab] ?? activeTab}` : ""} beserta seluruh data anggota jamaah terkait akan dihapus total dari database.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            Apakah Anda benar-benar yakin ingin menghapus seluruh riwayat pendaftaran ini sekarang?
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteAllModal(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 font-bold gap-1.5"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeleting ? "Menghapus..." : "Ya, Hapus Seluruh Riwayat"}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus Satuan */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Riwayat Pendaftaran"
        size="sm"
      >
        <div className="space-y-3 pt-2">
          <p className="text-xs text-gray-700">
            Apakah Anda yakin ingin menghapus riwayat pendaftaran untuk:
          </p>
          <div className="p-2.5 bg-gray-50 rounded-lg border text-xs font-mono">
            <p className="font-bold text-gray-900">{deleteTarget?.kodeRegistrasi}</p>
            <p className="text-gray-600">{deleteTarget?.namaPerwakilan} ({deleteTarget?.paxCount} Pax)</p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSingle}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 font-bold gap-1.5"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeleting ? "Menghapus..." : "Hapus"}</span>
            </Button>
          </div>
        </div>
      </Modal>

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

            {/* Bukti Transfer DP Inspector */}
            {(() => {
              const notes = detailTarget.catatanAdmin || "";
              const match = notes.match(/\[Bukti DP Uploaded[^\]]*\]:\s*(\S+)/);
              const rawUrl = match ? match[1] : null;
              const resolvedUrl = resolveDocumentImageUrl(rawUrl);

              return (
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center justify-between">
                    <span>Bukti Transfer DP Jamaah</span>
                    {resolvedUrl && (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded font-medium border border-green-200">
                        Sudah Diunggah
                      </span>
                    )}
                  </h4>

                  {resolvedUrl ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                      <div className="max-h-56 overflow-hidden rounded-lg border border-blue-200 bg-white flex items-center justify-center p-2">
                        <img
                          src={resolvedUrl}
                          alt="Bukti Transfer DP"
                          className="max-h-52 object-contain rounded"
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-blue-900 font-medium truncate max-w-[200px]">{rawUrl}</span>
                        <a
                          href={resolvedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
                        >
                          Buka Gambar Full
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                      Jamaah belum mengunggah foto bukti transfer DP.
                    </div>
                  )}

                  {notes && (
                    <div>
                      <span className="text-xs text-gray-500 font-medium">Catatan Admin / Riwayat:</span>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1 whitespace-pre-line font-mono">{notes}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Signature */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Tanda Tangan Digital</h4>
              <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">{detailTarget.signaturePath || "Tanda tangan tersedia"}</p>
            </div>

            {/* Modal Approve / Reject Action Buttons */}
            {detailTarget.status === "PENDING_REVIEW" && (
              <div className="pt-4 border-t flex justify-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setShowDetail(false); setRejectTarget(detailTarget); }}
                  disabled={processingId === detailTarget.id}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Tolak
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setShowDetail(false); handleApprove(detailTarget.id); }}
                  disabled={processingId === detailTarget.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingId === detailTarget.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  Setujui Pembayaran DP & Buat Invoice
                </Button>
              </div>
            )}
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
