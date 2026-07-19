import { getPaketDetailAction } from "@/server/domains/paket-umroh/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";

export default async function PaketInformasiPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: paket } = await getPaketDetailAction(params.id);

  if (!paket) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rincian Utama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Durasi Hari</p>
              <p className="font-medium">{paket.durasiHari} Hari</p>
            </div>
            <div>
              <p className="text-muted-foreground">Harga Base</p>
              <p className="font-medium">Rp {paket.hargaBase.toLocaleString("id-ID")}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Deskripsi</p>
              <p className="font-medium whitespace-pre-wrap">{paket.deskripsi}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Configuration Details Placeholder */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Data Hotel Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Hotel Mekkah</p>
              <div className="font-medium">
                {(paket.hotelMekkahOptions as string[]).map((h, i) => (
                  <div key={i}>- {h}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Hotel Madinah</p>
              <div className="font-medium">
                {(paket.hotelMadinahOptions as string[]).map((h, i) => (
                  <div key={i}>- {h}</div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
