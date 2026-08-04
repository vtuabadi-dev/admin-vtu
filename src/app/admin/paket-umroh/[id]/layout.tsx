import { Metadata } from "next";
import { getPaketDetailAction } from "@/server/domains/paket-umroh/actions";
import { WorkspaceLayout } from "@/shared/components/layout/WorkspaceLayout";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await getPaketDetailAction(params.id);
  return {
    title: `${data?.namaPaket ?? "Detail Paket"} | Admin VTU`,
  };
}

export default async function PaketUmrohWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const { data: paket } = await getPaketDetailAction(params.id);

  if (!paket) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-destructive">Paket tidak ditemukan</h1>
      </div>
    );
  }

  const tabs = [
    { label: "Informasi", href: `/admin/paket-umroh/${params.id}/informasi` },
    { label: "Info Hotel", href: `/admin/paket-umroh/${params.id}/info-hotel` },
    // Placeholder tabs for future sprint
    { label: "Jamaah (Coming Soon)", href: `/admin/paket-umroh/${params.id}/jamaah` },
    { label: "Invoice (Coming Soon)", href: `/admin/paket-umroh/${params.id}/invoice` },
    { label: "Manifest (Coming Soon)", href: `/admin/paket-umroh/${params.id}/manifest` },
    { label: "Riwayat", href: `/admin/paket-umroh/${params.id}/riwayat` },
  ];

  return (
    <div className="h-full p-6">
      <WorkspaceLayout
        title={paket.namaPaket}
        subtitle={`${paket.durasiHari} Hari`}
        tabs={tabs}
      >
        {children}
      </WorkspaceLayout>
    </div>
  );
}
