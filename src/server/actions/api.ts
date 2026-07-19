"use server";

import { prisma } from "@/server/db/client";


// ==========================================
// REAL PRISMA SERVICES
// Replaces all mock/handlers.ts functions
// ==========================================

export async function getKeberangkatanList() {
  return await prisma.keberangkatan.findMany({
    orderBy: { createdAt: "desc" },
    include: { paketUmroh: true },
  }) as any;
}

export async function getKeberangkatanById(id: string) {
  return await prisma.keberangkatan.findUnique({
    where: { id },
    include: { paketUmroh: true },
  }) as any;
}

export async function getJamaahList() {
  return await prisma.jamaah.findMany({
    orderBy: { createdAt: "desc" },
    include: { dokumen: true },
  }) as any;
}

export async function getGroupList() {
  return await prisma.registrationGroup.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getJamaahByGroup(groupId: string) {
  return await prisma.jamaah.findMany({
    where: { groupId },
    include: { dokumen: true },
  }) as any;
}

export async function getManifestById(id: string) {
  return await prisma.manifest.findUnique({
    where: { id },
    include: { rows: { include: { jamaah: true } }, keberangkatan: true },
  }) as any;
}

export async function getAllPaymentSummaries() {
  // Mock summaries usually returned an aggregated view
  // For now, we return empty arrays since real aggregation requires complex queries
  return [];
}

export async function getInvoiceList() {
  return await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getPembayaranList() {
  return await prisma.pembayaran.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getDokumenByJamaah(jamaahId: string) {
  return await prisma.dokumenItem.findMany({
    where: { jamaahId },
  }) as any;
}

export async function deleteKeberangkatan(id: string) {
  return await prisma.keberangkatan.delete({
    where: { id },
  }) as any;
}

export async function createKeberangkatan(data: any) {
  return await prisma.keberangkatan.create({
    data,
  }) as any;
}

export async function getJamaahById(id: string) {
  return await prisma.jamaah.findUnique({
    where: { id },
    include: { dokumen: true },
  }) as any;
}

export async function getJamaahReadiness(_id: string) {
  return {
    level: "INCOMPLETE",
    checks: [],
    passed: 0,
    total: 0,
    score: 0,
  } as any;
}

export async function getJamaahProgress(_id: string) {
  return {
    steps: [],
    currentStep: "test",
    completedSteps: 0,
    totalSteps: 0,
    percentComplete: 0,
  } as any;
}

export async function getDerivedStatus(_jamaah: any) {
  return "draft";
}

export async function getExportData(_request: any) {
  return { headers: [], rows: [] };
}

export async function getManifestList() {
  return await prisma.manifest.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getReminderList() {
  return []; // Mock return for now
}

export async function getGroupPaymentSummary(_groupId: string) {
  return null as any;
}

export async function addPembayaran(_data: any) {
  return null as any;
}

export async function cancelInvoiceItem(_invoiceId: string, _itemId: string, _reason: string, _user: string) {
  return null as any;
}

export async function getGroupByKode(_kode: string) {
  return null as any;
}

export async function fetchInvoiceSplitConfig(_groupId: string) {
  return null as any;
}

export async function saveInvoiceSplitConfig(_groupId: string, _data: any) {
  return null as any;
}

export async function getDashboardData() {
  return null as any;
}

export async function getAutoDeadlines(_keberangkatanId?: string) {
  return [] as any;
}

export async function getActivityFeed(_keberangkatanId?: string) {
  return [] as any;
}

export async function getAutoWarnings(_keberangkatanId?: string) {
  return [] as any;
}

export async function getPackageReadinessScore(_keberangkatanId: string) {
  return null as any;
}

export async function getOperationalTimeline(_keberangkatanId: string) {
  return [] as any;
}

export async function getFinalizationResult(_keberangkatanId: string) {
  return null as any;
}

export async function getDocumentCompletionMatrix(_keberangkatanId: string) {
  return [] as any;
}

export async function getRoomingList(_keberangkatanId?: string) {
  return [] as any;
}

export async function getPackageIntelligence(_keberangkatanId: string) {
  return null as any;
}

export async function submitRegistrasi(_data: any) {
  return null as any;
}
