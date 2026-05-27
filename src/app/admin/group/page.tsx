"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CreditCard,
  UserCheck,
  Search,
  Hash,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { StatCard } from "@/shared/components/ui/StatCard";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Table } from "@/shared/components/ui/Table";
import { Modal } from "@/shared/components/ui/Modal";
import { getGroupList, getJamaahByGroup } from "@/services/mock/handlers";
import type { RegistrationGroup, Jamaah } from "@/shared/types";
import { formatCurrency } from "@/shared/lib/utils";

export default function GroupListPage() {
  const [groups, setGroups] = useState<RegistrationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<RegistrationGroup | null>(null);
  const [members, setMembers] = useState<Jamaah[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const g = await getGroupList();
      setGroups(g);
      setLoading(false);
    }
    load();
  }, []);

  async function openGroupDetail(group: RegistrationGroup) {
    setSelectedGroup(group);
    setMembersLoading(true);
    const jamaahList = await getJamaahByGroup(group.id);
    setMembers(jamaahList);
    setMembersLoading(false);
  }

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) =>
      g.namaGroup.toLowerCase().includes(q) ||
      g.kodeRegistrasi.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const totalStats = useMemo(() => {
    const totalJamaah = groups.reduce((sum, g) => sum + g.jumlahAnggota, 0);
    const totalTagihan = groups.reduce((sum, g) => sum + g.totalTagihan, 0);
    const totalDibayar = groups.reduce((sum, g) => sum + g.totalPembayaran, 0);
    const activeGroups = groups.filter((g) => g.status === "active").length;
    return { totalJamaah, totalTagihan, totalDibayar, activeGroups };
  }, [groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data group...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Registration Group</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola grup registrasi dan anggota jamaah
          </p>
        </div>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Tambah Group
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Group Aktif" value={totalStats.activeGroups} icon={UserCheck} variant="success" />
        <StatCard label="Total Jamaah" value={totalStats.totalJamaah} icon={Users} />
        <StatCard label="Total Tagihan" value={formatCurrency(totalStats.totalTagihan)} icon={Wallet} variant="info" />
        <StatCard label="Total Dibayar" value={formatCurrency(totalStats.totalDibayar)} icon={CreditCard} variant="success" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari kode atau nama group..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredGroups.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Tidak ada group ditemukan
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              variant="operational"
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => openGroupDetail(group)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{group.kodeRegistrasi}</p>
                    <CardTitle className="text-base mt-0.5">{group.namaGroup}</CardTitle>
                  </div>
                  <StatusBadge status={group.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Anggota</span>
                  <span className="font-semibold">{group.jumlahAnggota} orang</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-semibold">{formatCurrency(group.totalTagihan)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dibayar</span>
                  <span className="font-semibold">{formatCurrency(group.totalPembayaran)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sisa</span>
                  <span className={group.sisaPembayaran > 0 ? "font-semibold text-destructive" : "font-semibold text-success"}>
                    {formatCurrency(group.sisaPembayaran)}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  <Hash className="mr-1.5 h-3.5 w-3.5" />
                  Lihat Anggota & Pembayaran
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title={`${selectedGroup?.kodeRegistrasi} — ${selectedGroup?.namaGroup ?? ""}`}
        description={`${selectedGroup?.jumlahAnggota ?? 0} anggota`}
        size="lg"
      >
        {membersLoading ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Memuat anggota...</p>
          </div>
        ) : (
          <Table
            keyField="id"
            columns={[
              { key: "regId", header: "Reg ID", accessor: (row) => (
                <span className="font-mono text-xs">{row.registrationId}</span>
              )},
              { key: "nama", header: "Nama", accessor: (row) => (
                <span className="font-medium">{row.namaLengkap}</span>
              )},
              { key: "paspor", header: "Paspor", accessor: (row) => row.nomorPaspor },
              { key: "jk", header: "L/P", accessor: (row) => row.jenisKelamin },
              { key: "status", header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
            ]}
            data={members}
          />
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setSelectedGroup(null)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
}
