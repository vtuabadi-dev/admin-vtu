import { Metadata } from "next";
import Link from "next/link";
import { getPaketListAction } from "@/server/domains/paket-umroh/actions";
import { masterDataService } from "@/server/services/master-data.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { MapPin, Star, ExternalLink, Building2, Eye } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Info Hotel Paket Umroh | Admin VTU",
};

export default async function PaketUmrohInfoHotelPage() {
  const [paketRes, hotelsRes] = await Promise.all([
    getPaketListAction(),
    masterDataService.getHotels({ limit: 200 }),
  ]);

  const paketList = paketRes.data || [];
  const allHotels = hotelsRes.data || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Info Hotel Paket Umroh</h1>
          <p className="text-muted-foreground mt-1">
            Informasi hotel Mekkah & Madinah per paket umroh lengkap dengan jarak ke pelataran dan video review.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {paketList.length > 0 ? (
          paketList.map((paket: any) => {
            const mekkahNames = (paket.hotelMekkahOptions as string[]) || [];
            const madinahNames = (paket.hotelMadinahOptions as string[]) || [];

            const mekkahHotels = mekkahNames.map((name) => {
              const found = allHotels.find(
                (h) => h.name.toLowerCase() === name.toLowerCase() || h.code.toLowerCase() === name.toLowerCase()
              );
              return {
                nama: name,
                starRating: found?.starRating || 5,
                jarakText: found?.jarakText || "Belum diatur",
                videoJarakUrl: found?.videoJarakUrl || null,
              };
            });

            const madinahHotels = madinahNames.map((name) => {
              const found = allHotels.find(
                (h) => h.name.toLowerCase() === name.toLowerCase() || h.code.toLowerCase() === name.toLowerCase()
              );
              return {
                nama: name,
                starRating: found?.starRating || 5,
                jarakText: found?.jarakText || "Belum diatur",
                videoJarakUrl: found?.videoJarakUrl || null,
              };
            });

            return (
              <Card key={paket.id} className="border border-border shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-4 px-6 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold">{paket.namaPaket}</CardTitle>
                      <Badge variant="outline">{paket.durasiHari} Hari</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Harga Base: Rp {paket.hargaBase.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Link href={`/admin/paket-umroh/${paket.id}/info-hotel`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" /> Detail Workspace
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mekkah Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>Hotel Makkah Al-Mukarramah</span>
                      </div>
                      {mekkahHotels.map((h, idx) => (
                        <div key={idx} className="bg-card border rounded-md p-3.5 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{h.nama}</span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {h.jarakText}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: h.starRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                            <span className="text-muted-foreground text-[11px] ml-1">{h.starRating} Bintang</span>
                          </div>
                          {h.videoJarakUrl ? (
                            <div className="pt-2 border-t mt-2">
                              <a
                                href={h.videoJarakUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:underline font-medium inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="h-3 w-3" /> Tonton Video Perjalanan Jarak
                              </a>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic pt-1">Belum ada video perjalanan.</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Madinah Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>Hotel Madinah Al-Munawwarah</span>
                      </div>
                      {madinahHotels.map((h, idx) => (
                        <div key={idx} className="bg-card border rounded-md p-3.5 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{h.nama}</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {h.jarakText}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: h.starRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                            <span className="text-muted-foreground text-[11px] ml-1">{h.starRating} Bintang</span>
                          </div>
                          {h.videoJarakUrl ? (
                            <div className="pt-2 border-t mt-2">
                              <a
                                href={h.videoJarakUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="h-3 w-3" /> Tonton Video Perjalanan Jarak
                              </a>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic pt-1">Belum ada video perjalanan.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground text-sm">
            Belum ada Paket Umroh terdaftar.
          </div>
        )}
      </div>
    </div>
  );
}
