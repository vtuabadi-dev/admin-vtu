import { getPaketDetailAction } from "@/server/domains/paket-umroh/actions";
import { masterDataService } from "@/server/services/master-data.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { MapPin, Star, ExternalLink, Building2 } from "lucide-react";

export default async function PaketInfoHotelPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: paket } = await getPaketDetailAction(params.id);
  if (!paket) return null;

  // Fetch all master hotels to match options
  const hotelsRes = await masterDataService.getHotels({ limit: 200 });

  const allHotels = hotelsRes.data || [];

  const mekkahNames = (paket.hotelMekkahOptions as string[]) || [];
  const madinahNames = (paket.hotelMadinahOptions as string[]) || [];

  // Match master hotels by name (case-insensitive) or code
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Informasi Hotel Paket</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Rincian hotel Mekkah dan Madinah lengkap dengan jarak ke pelataran dan video review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hotel Mekkah Card */}
        <Card className="border border-emerald-500/20 shadow-sm">
          <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                  Hotel Makkah Al-Mukarramah
                </CardTitle>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Makkah</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {mekkahHotels.length > 0 ? (
              mekkahHotels.map((h, i) => (
                <div key={i} className="bg-card border rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{h.nama}</h3>
                      <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs">
                        {Array.from({ length: h.starRating }).map((_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-muted-foreground ml-1 font-medium">{h.starRating} Bintang</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      {h.jarakText}
                    </Badge>
                  </div>

                  {/* Video Distance Preview Section */}
                  <div className="pt-2 border-t text-xs">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-2">
                      Video Perjalanan ke Pelataran
                    </span>
                    {h.videoJarakUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-video bg-black rounded-md overflow-hidden relative group">
                          {h.videoJarakUrl.includes(".mp4") || h.videoJarakUrl.startsWith("/api/storage") ? (
                            <video src={h.videoJarakUrl} controls className="w-full h-full object-contain" />
                          ) : (
                            <iframe
                              src={h.videoJarakUrl.replace("/view", "/preview")}
                              className="w-full h-full border-0"
                              allow="autoplay"
                              title={`Video ${h.nama}`}
                            />
                          )}
                        </div>
                        <a
                          href={h.videoJarakUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" /> Tonton di Google Drive / Tab Baru
                        </a>
                      </div>
                    ) : (
                      <div className="bg-muted/40 p-3 rounded text-center text-muted-foreground text-xs">
                        Belum ada video perjalanan yang diunggah untuk hotel ini.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada konfigurasi hotel Makkah.</p>
            )}
          </CardContent>
        </Card>

        {/* Hotel Madinah Card */}
        <Card className="border border-blue-500/20 shadow-sm">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  Hotel Madinah Al-Munawwarah
                </CardTitle>
              </div>
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Madinah</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {madinahHotels.length > 0 ? (
              madinahHotels.map((h, i) => (
                <div key={i} className="bg-card border rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{h.nama}</h3>
                      <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs">
                        {Array.from({ length: h.starRating }).map((_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-muted-foreground ml-1 font-medium">{h.starRating} Bintang</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3 text-blue-600" />
                      {h.jarakText}
                    </Badge>
                  </div>

                  {/* Video Distance Preview Section */}
                  <div className="pt-2 border-t text-xs">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-2">
                      Video Perjalanan ke Pelataran
                    </span>
                    {h.videoJarakUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-video bg-black rounded-md overflow-hidden relative group">
                          {h.videoJarakUrl.includes(".mp4") || h.videoJarakUrl.startsWith("/api/storage") ? (
                            <video src={h.videoJarakUrl} controls className="w-full h-full object-contain" />
                          ) : (
                            <iframe
                              src={h.videoJarakUrl.replace("/view", "/preview")}
                              className="w-full h-full border-0"
                              allow="autoplay"
                              title={`Video ${h.nama}`}
                            />
                          )}
                        </div>
                        <a
                          href={h.videoJarakUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" /> Tonton di Google Drive / Tab Baru
                        </a>
                      </div>
                    ) : (
                      <div className="bg-muted/40 p-3 rounded text-center text-muted-foreground text-xs">
                        Belum ada video perjalanan yang diunggah untuk hotel ini.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada konfigurasi hotel Madinah.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
