import { prisma } from "@/server/db/client";
import type { RegistrationRequest, RegistrationMember, RegistrationStatus } from "@/shared/types";

function mapRequest(row: any): RegistrationRequest {
  return {
    id: row.id,
    kodeRegistrasi: row.kodeRegistrasi,
    namaPerwakilan: row.namaPerwakilan,
    nomorTelepon: row.nomorTelepon,
    emailPerwakilan: row.emailPerwakilan,
    paxCount: row.paxCount,
    paketId: row.paketId,
    roomUpgrade: row.roomUpgrade ?? undefined,
    hotelUpgrade: row.hotelUpgrade ?? undefined,
    signaturePath: row.signaturePath,
    termsAccepted: row.termsAccepted,
    termsAcceptedAt: row.termsAcceptedAt?.toISOString(),
    signedAt: row.signedAt?.toISOString(),
    leadStatus: row.leadStatus ?? undefined,
    status: row.status as RegistrationStatus,
    catatanAdmin: row.catatanAdmin ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
    groupId: row.groupId ?? undefined,
    members: (row.members ?? []).map(mapMember),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMember(row: any): RegistrationMember {
  return {
    id: row.id,
    requestId: row.requestId,
    namaLengkap: row.namaLengkap,
    jenisKelamin: row.jenisKelamin,
    hubungan: row.hubungan ?? undefined,
    urutan: row.urutan,
  };
}

export const registrationRepo = {
  async findAll(params?: { status?: string; paketId?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.paketId) where.paketId = params.paketId;

    const [rows, total] = await Promise.all([
      prisma.registrationRequest.findMany({
        where,
        include: { members: { orderBy: { urutan: "asc" } } },
        take: params?.limit ?? 50,
        skip: params?.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.registrationRequest.count({ where }),
    ]);
    return { data: rows.map(mapRequest), total };
  },

  async findById(id: string) {
    const row = await prisma.registrationRequest.findUnique({
      where: { id },
      include: { members: { orderBy: { urutan: "asc" } }, keberangkatan: true },
    });
    return row ? mapRequest(row) : null;
  },

  async findByKode(kodeRegistrasi: string) {
    const row = await prisma.registrationRequest.findUnique({
      where: { kodeRegistrasi },
      include: { members: { orderBy: { urutan: "asc" } } },
    });
    return row ? mapRequest(row) : null;
  },

  async create(data: {
    kodeRegistrasi: string;
    namaPerwakilan: string;
    nomorTelepon: string;
    emailPerwakilan: string;
    paxCount: number;
    paketId: string;
    roomUpgrade?: string;
    hotelUpgrade?: string;
    signaturePath: string;
    termsAccepted: boolean;
    termsAcceptedAt?: Date;
    signedAt?: Date;
    leadStatus?: string;
    status: string;
    members: { namaLengkap: string; jenisKelamin: string; hubungan?: string | undefined; urutan: number }[];
  }) {
    const row = await prisma.registrationRequest.create({
      data: {
        kodeRegistrasi: data.kodeRegistrasi,
        namaPerwakilan: data.namaPerwakilan,
        nomorTelepon: data.nomorTelepon,
        emailPerwakilan: data.emailPerwakilan,
        paxCount: data.paxCount,
        paketId: data.paketId,
        roomUpgrade: data.roomUpgrade ?? null,
        hotelUpgrade: data.hotelUpgrade ?? null,
        signaturePath: data.signaturePath,
        termsAccepted: data.termsAccepted,
        termsAcceptedAt: data.termsAcceptedAt ?? null,
        signedAt: data.signedAt ?? null,
        leadStatus: data.leadStatus ? (data.leadStatus as any) : null,
        status: data.status as any,
        members: {
          create: data.members.map((m) => ({
            namaLengkap: m.namaLengkap,
            jenisKelamin: m.jenisKelamin as any,
            hubungan: m.hubungan ?? null,
            urutan: m.urutan,
          })),
        },
      },
      include: { members: { orderBy: { urutan: "asc" } } },
    });
    return mapRequest(row);
  },

  async updateStatus(id: string, status?: string, extra?: { catatanAdmin?: string; reviewedBy?: string; groupId?: string; leadStatus?: string }) {
    const data: any = { reviewedAt: extra ? new Date() : undefined };
    if (status !== undefined) data.status = status as any;
    if (extra?.leadStatus !== undefined) data.leadStatus = extra.leadStatus as any;
    if (extra?.catatanAdmin !== undefined) data.catatanAdmin = extra.catatanAdmin;
    if (extra?.reviewedBy !== undefined) data.reviewedBy = extra.reviewedBy;
    if (extra?.groupId !== undefined) data.groupId = extra.groupId;

    const row = await prisma.registrationRequest.update({
      where: { id },
      data,
      include: { members: { orderBy: { urutan: "asc" } } },
    });
    return mapRequest(row);
  },

  async countByStatus() {
    const rows = await prisma.registrationRequest.groupBy({ by: ["status"], _count: true });
    return Object.fromEntries(rows.map((r) => [r.status, r._count]));
  },
};
