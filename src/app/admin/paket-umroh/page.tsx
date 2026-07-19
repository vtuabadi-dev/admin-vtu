import { Metadata } from "next";
import Link from "next/link";
import { getPaketListAction } from "@/server/domains/paket-umroh/actions";
import { Button } from "@/shared/components/ui/Button";

export const metadata: Metadata = {
  title: "Daftar Paket Umroh | Admin",
};

export default async function PaketUmrohListPage() {
  const { data: list } = await getPaketListAction();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Semua Paket Umroh</h1>
          <p className="text-muted-foreground mt-1">
            Manajemen produk paket umroh (Aggregate Root).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/paket-umroh/generate">
            <Button>Generate Paket</Button>
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-medium">Nama Paket</th>
              <th className="px-6 py-3 font-medium">Durasi</th>
              <th className="px-6 py-3 font-medium">Harga Base</th>
              <th className="px-6 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list && list.length > 0 ? (
              list.map((paket: any) => (
                <tr key={paket.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{paket.namaPaket}</td>
                  <td className="px-6 py-4">{paket.durasiHari} Hari</td>
                  <td className="px-6 py-4">Rp {paket.hargaBase.toLocaleString("id-ID")}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/paket-umroh/${paket.id}/informasi`}>
                      <Button variant="outline" size="sm">
                        Detail
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  Tidak ada paket ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
