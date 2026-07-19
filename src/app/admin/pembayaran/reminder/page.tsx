"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, Send, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { getAllPaymentSummaries, getKeberangkatanList } from "@/server/actions/api";
import type { GroupPaymentSummary, Keberangkatan } from "@/shared/types";

interface PackageDeadline {
  no: number;
  paketId: string;
  namaPaket: string;
  tanggalBerangkat: string;
  deadline: string;
  sisaHari: number;
  jumlahJamaahBelumLunas: number;
  unpaidGroups: GroupPaymentSummary[];
}

function hitungDeadline(tanggalBerangkat: string): { deadline: string; sisaHari: number } {
  const berangkat = new Date(tanggalBerangkat);
  const deadline = new Date(berangkat);
  deadline.setDate(deadline.getDate() - 40);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const sisaHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    deadline: deadline.toISOString().split("T")[0]!,
    sisaHari,
  };
}

export default function JadwalReminderPage() {
  const [summaries, setSummaries] = useState<GroupPaymentSummary[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [s, k] = await Promise.all([getAllPaymentSummaries(), getKeberangkatanList()]);
      setSummaries(s);
      setKbrList(k);
      setLoading(false);
    }
    load();
  }, []);

  const deadlines = useMemo((): PackageDeadline[] => {
    return kbrList
      .map((kbr, idx) => {
        const { deadline, sisaHari } = hitungDeadline(kbr.tanggalBerangkat);

        const unpaidGroups = summaries.filter((s) => {
          const groupKbr = kbr.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid));
          return groupKbr && s.sisaPembayaran > 0;
        });

        const jumlahJamaahBelumLunas = unpaidGroups.reduce((sum, g) => sum + g.jumlahAnggota, 0);

        return {
          no: idx + 1,
          paketId: kbr.id,
          namaPaket: kbr.paketUmroh?.namaPaket || "-",
          tanggalBerangkat: kbr.tanggalBerangkat,
          deadline,
          sisaHari,
          jumlahJamaahBelumLunas,
          unpaidGroups,
        };
      })
      .filter((d) => d.jumlahJamaahBelumLunas > 0)
      .sort((a, b) => a.sisaHari - b.sisaHari);
  }, [kbrList, summaries]);

  function handleKirimReminder(pkg: PackageDeadline) {
    setSending(pkg.paketId);

    const messages = pkg.unpaidGroups.map((g) => {
      const groupKbr = kbrList.find((k) => k.jamaahIds.some((jid) => g.anggota.some((a) => a.id === jid)));
      const namaPaket = groupKbr?.paketUmroh?.namaPaket ?? pkg.namaPaket;
      return `Assalamu'alaikum Bapak/Ibu ${g.namaGroup}\n\nKami mengingatkan bahwa masih terdapat sisa tagihan sebesar Rp${g.sisaPembayaran.toLocaleString("id-ID")} untuk paket ${namaPaket}.\n\nBatas waktu pelunasan: ${pkg.deadline} (${pkg.sisaHari} hari lagi). Mohon segera diselesaikan.\n\nTerima kasih.`;
    });

    setTimeout(() => {
      alert(`${messages.length} reminder terkirim untuk paket "${pkg.namaPaket}":\n\n${messages.slice(0, 3).join("\n\n---\n\n")}${messages.length > 3 ? `\n\n...dan ${messages.length - 3} lainnya` : ""}`);
      setSending(null);
    }, 300);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jadwal Reminder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoring deadline pelunasan per paket (H-40 sebelum keberangkatan)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Deadline Pelunasan Paket
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              Semua paket sudah lunas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 w-10">No</th>
                    <th className="pb-3">Nama Paket</th>
                    <th className="pb-3">Jumlah Jamaah Belum Lunas</th>
                    <th className="pb-3">Sisa Hari Menuju Deadline</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deadlines.map((d) => (
                    <tr key={d.paketId} className="hover:bg-muted/30">
                      <td className="py-3 text-muted-foreground">{d.no}</td>
                      <td className="py-3">
                        <p className="font-medium">{d.namaPaket}</p>
                        <p className="text-xs text-muted-foreground">
                          Deadline: {d.deadline} &middot; Berangkat: {d.tanggalBerangkat}
                        </p>
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-destructive">
                          {d.jumlahJamaahBelumLunas} orang
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({d.unpaidGroups.length} grup)
                        </span>
                      </td>
                      <td className="py-3">
                        {d.sisaHari <= 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Overdue {Math.abs(d.sisaHari)} hari
                          </Badge>
                        ) : d.sisaHari <= 7 ? (
                          <Badge variant="warning" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {d.sisaHari} hari
                          </Badge>
                        ) : (
                          <span className="text-sm">{d.sisaHari} hari</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleKirimReminder(d)}
                          disabled={sending === d.paketId}
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          {sending === d.paketId ? "Mengirim..." : "Kirim Reminder"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
