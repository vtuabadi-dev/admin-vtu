"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { AccordionSection } from "@/shared/components/ui";
import { 
  MOCK_LANDING_PATTERN, 
  MOCK_KLASTER
} from "@/shared/lib/mock-data";

interface MasterDataOptions {
  airlines: any[];
  hotels: any[];
  cities: any[];
  packageTypes: any[];
}

export default function GeneratePaketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [options, setOptions] = useState<MasterDataOptions | null>(null);

  const [formData, setFormData] = useState({
    jenisPaketId: "",
    namaPaket: "",
    startingPointId: "",
    landingPatternId: "",
    maskapaiId: "",
    hotelMekkahId: "",
    hotelMadinahId: "",
    klasterId: "",
    isAdaPerlengkapan: "",
    hargaBase: "",
    durasiHari: "",
  });

  useEffect(() => {
    fetch("/api/master/options")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setOptions(res.data);
        }
        setFetching(false);
      })
      .catch(err => {
        console.error("Failed to fetch master data options", err);
        setFetching(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async () => {
    setLoading(true);
    // Mock simulation
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 800);
  };

  // Filter hotels by cities
  const mekkahCity = options?.cities.find(c => c.code === "MEK" || c.name.toLowerCase() === "mekkah");
  const madinahCity = options?.cities.find(c => c.code === "MED" || c.name.toLowerCase() === "madinah");
  
  const mekkahHotels = options?.hotels.filter(h => h.cityId === mekkahCity?.id) || [];
  const madinahHotels = options?.hotels.filter(h => h.cityId === madinahCity?.id) || [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Paket Umroh</h1>
          <p className="text-muted-foreground mt-1">
            Wizard perakitan paket (Transaction Data) yang mengambil referensi dari Master Data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/paket-umroh")}>Batal</Button>
          <Button onClick={handleGenerate} disabled={loading || fetching}>
            {loading ? "Memproses..." : "Generate Paket"}
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-100 text-green-700 rounded-md">
          Paket Umroh berhasil digenerate! (Ini adalah UI Prototype menggunakan Database Master Data)
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Step 1: Dasar Paket */}
        <AccordionSection title="Langkah 1: Dasar Paket" defaultOpen>
          <div className="p-4 bg-card border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Jenis Paket (Master Data)</label>
              <select name="jenisPaketId" value={formData.jenisPaketId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Jenis Paket --</option>
                {fetching ? (
                  <option disabled>Loading jenis paket...</option>
                ) : (
                  options?.packageTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nama Paket</label>
              <Input name="namaPaket" value={formData.namaPaket} onChange={handleChange} placeholder="Misal: Umroh Syawal 2026" />
            </div>
          </div>
        </AccordionSection>

        {/* Step 2: Penerbangan */}
        <AccordionSection title="Langkah 2: Rute & Penerbangan" defaultOpen>
          <div className="p-4 bg-card border rounded-md grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Starting Point</label>
              <select name="startingPointId" value={formData.startingPointId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Kota --</option>
                {fetching ? (
                  <option disabled>Loading starting points...</option>
                ) : (
                  options?.cities.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rute In-Out</label>
              <select name="landingPatternId" value={formData.landingPatternId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent">
                <option value="">-- Pilih Rute --</option>
                {MOCK_LANDING_PATTERN.map((item) => (
                  <option key={item.id} value={item.id}>{item.kode} - {item.nama} ({item.rute})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maskapai</label>
              <select name="maskapaiId" value={formData.maskapaiId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Maskapai --</option>
                {fetching ? (
                  <option disabled>Loading maskapai...</option>
                ) : (
                  options?.airlines.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </AccordionSection>

        {/* Step 3: Akomodasi */}
        <AccordionSection title="Langkah 3: Akomodasi & Hotel" defaultOpen>
          <div className="p-4 bg-card border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hotel Mekkah</label>
              <select name="hotelMekkahId" value={formData.hotelMekkahId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Hotel Mekkah --</option>
                {fetching ? (
                  <option disabled>Loading hotel Mekkah...</option>
                ) : (
                  mekkahHotels.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.starRating || 5}⭐)</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hotel Madinah</label>
              <select name="hotelMadinahId" value={formData.hotelMadinahId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent" disabled={fetching}>
                <option value="">-- Pilih Hotel Madinah --</option>
                {fetching ? (
                  <option disabled>Loading hotel Madinah...</option>
                ) : (
                  madinahHotels.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.starRating || 5}⭐)</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </AccordionSection>

        {/* Step 4: Lainnya */}
        <AccordionSection title="Langkah 4: Operasional & Harga" defaultOpen>
          <div className="p-4 bg-card border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Klaster Seat</label>
              <select name="klasterId" value={formData.klasterId} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent">
                <option value="">-- Pilih Klaster --</option>
                {MOCK_KLASTER.map((item) => (
                  <option key={item.id} value={item.id}>{item.nama} (Kapasitas: {item.kapasitas})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Termasuk Perlengkapan?</label>
              <select name="isAdaPerlengkapan" value={formData.isAdaPerlengkapan} onChange={handleChange} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent">
                <option value="">-- Pilih --</option>
                <option value="ya">Ya, Termasuk Perlengkapan</option>
                <option value="tidak">Tidak Termasuk</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Durasi (Hari)</label>
              <Input type="number" name="durasiHari" value={formData.durasiHari} onChange={handleChange} placeholder="9" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Harga Base (Rp)</label>
              <Input type="number" name="hargaBase" value={formData.hargaBase} onChange={handleChange} placeholder="35000000" />
            </div>
          </div>
        </AccordionSection>

      </div>
    </div>
  );
}

