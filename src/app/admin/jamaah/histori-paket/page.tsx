"use client";

import { useEffect, useState, useMemo } from "react";
import { Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Table } from "@/shared/components/ui/Table";
import { getJamaahList, getKeberangkatanList } from "@/services/mock/handlers";
import type { Jamaah, Keberangkatan } from "@/shared/types";
import { formatDate } from "@/shared/lib/utils";

export default function HistoriPaketPage() {
  const [jamaahList, setJamaahList] = useState<Jamaah[]>([]);
  const [kbrList, setKbrList] = useState<Keberangkatan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [j, k] = await Promise.all([getJamaahList(), getKeberangkatanList()]);
      setJamaahList(j);
      setKbrList(k);
      setLoading(false);
    }
    load();
  }, []);

  const rows = useMemo(() => {
    return jamaahList.flatMap((jmh) => {
      const kbrs = kbrList.filter((k) => k.jamaahIds.includes(jmh.id));
      return kbrs.map((k) => ({
        id: `${jmh.id}-${k.id}`,
        namaJamaah: jmh.namaLengkap,
        namaPaket: k.namaPaket,
        tanggalBerangkat: k.tanggalBerangkat,
        maskapai: k.maskapai,
        status: k.status,
      }));
    });
  }, [jamaahList, kbrList]);

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
        <h1 className="text-2xl font-bold tracking-tight">Histori Paket Jamaah</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Riwayat paket yang pernah diikuti oleh jamaah
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            <Plane className="mr-2 inline h-4 w-4" />
            Daftar Riwayat Paket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            keyField="id"
            columns={[
              { key: "nama", header: "Jamaah", accessor: (r) => <span className="font-medium">{r.namaJamaah}</span> },
              { key: "paket", header: "Paket", accessor: (r) => <span>{r.namaPaket}</span> },
              { key: "tgl", header: "Tgl. Berangkat", accessor: (r) => <span className="text-sm">{formatDate(r.tanggalBerangkat)}</span> },
              { key: "maskapai", header: "Maskapai", accessor: (r) => <span className="text-sm">{r.maskapai}</span> },
              { key: "status", header: "Status", accessor: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
