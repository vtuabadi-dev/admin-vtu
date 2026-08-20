"use client";

import { useState, useEffect } from "react";
import { Save, Send, Eye, EyeOff, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

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

export function TelegramBroadcastTab() {
  const [botToken, setBotToken] = useState("");
  const [groupIdJakarta, setGroupIdJakarta] = useState("");
  const [groupIdSurabaya, setGroupIdSurabaya] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingJkt, setTestingJkt] = useState(false);
  const [testingSub, setTestingSub] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/settings/telegram");
        const json = await res.json();
        if (json.success && json.data) {
          setBotToken(json.data.botToken || "");
          setGroupIdJakarta(json.data.groupIdJakarta || "");
          setGroupIdSurabaya(json.data.groupIdSurabaya || "");
          setEnabled(json.data.enabled !== false);
        }
      } catch (err) {
        console.error("Gagal memuat konfigurasi Telegram:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          groupIdJakarta,
          groupIdSurabaya,
          enabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: "Konfigurasi Broadcast Telegram berhasil disimpan!" });
      } else {
        setFeedback({ type: "error", message: json.message || "Gagal menyimpan konfigurasi." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestBroadcast = async (targetGroup: "jakarta" | "surabaya") => {
    if (targetGroup === "jakarta") setTestingJkt(true);
    else setTestingSub(true);

    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          targetGroup,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: "success",
          message: json.message || `Tes pesan broadcast berhasil dikirim ke grup ${targetGroup.toUpperCase()}!`,
        });
      } else {
        setFeedback({ type: "error", message: json.message || "Gagal mengirim pesan tes." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: (err as Error).message });
    } finally {
      if (targetGroup === "jakarta") setTestingJkt(false);
      else setTestingSub(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Memuat konfigurasi Telegram...</div>;
  }

  const isConfigured = Boolean(botToken && (groupIdJakarta || groupIdSurabaya));

  return (
    <div className="space-y-6">
      {/* Header Status Card */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              enabled && isConfigured
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Status Gateway Telegram</h4>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? isConfigured
                  ? "Broadcast Otomatis Aktif & Terkonfigurasi"
                  : "Bot Token atau ID Grup belum lengkap"
                : "Broadcast Otomatis Non-Aktif"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled && isConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" /> Perlu Setup
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-md p-3 text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* ── Konfigurasi Bot & Fitur ── */}
      <SettingSection
        title="Otomatisasi & Bot Token Telegram"
        desc="Atur Token Bot resmi dari Telegram (@BotFather) dan toggle status pengiriman."
      >
        <SettingRow
          label="Aktifkan Broadcast Otomatis"
          desc="Kirim otomatis flyer + caption + reply kode paket ke Telegram saat menekan tombol 'Generate Paket'"
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary mt-1"
          />
        </SettingRow>

        <SettingRow
          label="Telegram Bot Token"
          desc="Token Bot HTTP API yang didapatkan dari @BotFather (misal: 123456789:AAFg...)"
        >
          <div className="relative flex items-center">
            <input
              type={showToken ? "text" : "password"}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Masukkan Token Bot Telegram"
              className="h-9 w-72 rounded-md border border-input bg-transparent px-3 pr-9 py-1 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </SettingRow>
      </SettingSection>

      {/* ── Konfigurasi Target Group IDs ── */}
      <SettingSection
        title="ID Grup Telegram Target Broadcast"
        desc="Masukkan ID Grup Telegram untuk pemisahan broadcast berdasarkan lokasi Starting Point keberangkatan."
      >
        <SettingRow
          label="ID Grup Telegram — Starting Jakarta (JKT)"
          desc="ID Grup Telegram khusus broadcast keberangkatan Jakarta (contoh: -1001234567890)"
        >
          <input
            type="text"
            value={groupIdJakarta}
            onChange={(e) => setGroupIdJakarta(e.target.value)}
            placeholder="-1001234567890"
            className="h-9 w-72 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
          />
        </SettingRow>

        <SettingRow
          label="ID Grup Telegram — Starting Surabaya (SUB)"
          desc="ID Grup Telegram khusus broadcast keberangkatan Surabaya (contoh: -1009876543210)"
        >
          <input
            type="text"
            value={groupIdSurabaya}
            onChange={(e) => setGroupIdSurabaya(e.target.value)}
            placeholder="-1009876543210"
            className="h-9 w-72 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
          />
        </SettingRow>
      </SettingSection>

      {/* ── Tombol Simpan & Uji Coba ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Konfigurasi Broadcast"}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestBroadcast("jakarta")}
            disabled={testingJkt || !botToken || !groupIdJakarta}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {testingJkt ? "Kirim Tes..." : "Tes Broadcast Jakarta"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestBroadcast("surabaya")}
            disabled={testingSub || !botToken || !groupIdSurabaya}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {testingSub ? "Kirim Tes..." : "Tes Broadcast Surabaya"}
          </Button>
        </div>
      </div>
    </div>
  );
}
