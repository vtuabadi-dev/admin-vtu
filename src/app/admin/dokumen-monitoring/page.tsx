import { redirect } from "next/navigation";

export default function DokumenMonitoringPage() {
  redirect("/admin/dokumen?tab=rekap");
}
