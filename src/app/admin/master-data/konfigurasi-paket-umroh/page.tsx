"use client";

import { useState, useEffect } from "react";
import { 
  MOCK_LANDING_PATTERN, 
  MOCK_KLASTER 
} from "@/shared/lib/mock-data";
import { Tabs } from "@/shared/components/ui/Tabs";
import { CrudTab } from "./components/CrudTab";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Trash2 } from "lucide-react";

const TABS = [
  { value: "jenis-paket", label: "Jenis Paket" },
  { value: "starting-point", label: "Starting Point" },
  { value: "rute-in-out", label: "Rute In-Out" },
  { value: "maskapai", label: "Maskapai" },
  { value: "hotel", label: "Hotel" },
  { value: "klaster", label: "Klaster" },
];

const STATUS_OPTIONS = [
  { label: "Aktif", value: "Aktif" },
  { label: "Nonaktif", value: "Nonaktif" },
];

export default function MasterKonfigurasiPaketUmrohPage() {
  const [cities, setCities] = useState<any[]>([]);
  const [hotelCityIds, setHotelCityIds] = useState<string[]>([]);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/master/cities")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCities(res.data);
          // Initial load from localStorage or scan default Saudi cities
          const saved = localStorage.getItem("hotel_city_ids");
          if (saved) {
            const parsed = JSON.parse(saved);
            setHotelCityIds(parsed);
            setSelectedCityIds(parsed);
          } else {
            const defaults = res.data
              .filter((c: any) => {
                const nameLower = c.name.toLowerCase();
                return nameLower.includes("mekkah") || nameLower.includes("makkah") || nameLower.includes("madinah") || nameLower.includes("jeddah");
              })
              .map((c: any) => c.id);
            setHotelCityIds(defaults);
            setSelectedCityIds(defaults);
            localStorage.setItem("hotel_city_ids", JSON.stringify(defaults));
          }
        }
      })
      .catch((err) => console.error("Failed to load cities for dropdown selection options", err));
  }, []);

  const handleOpenSettings = () => {
    setSelectedCityIds(hotelCityIds);
    setSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    setHotelCityIds(selectedCityIds);
    localStorage.setItem("hotel_city_ids", JSON.stringify(selectedCityIds));
    setSettingsOpen(false);
  };

  const [newCityName, setNewCityName] = useState("");
  const [newCityCode, setNewCityCode] = useState("");
  const [addingCity, setAddingCity] = useState(false);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    try {
      setAddingCity(true);
      const code = newCityCode.trim() || `CTY-${newCityName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "-").substring(0, 5)}`;
      const res = await fetch("/api/master/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: newCityName.trim(), kode: code }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        const cRes = await fetch("/api/master/cities");
        const cJson = await cRes.json();
        if (cJson.success) {
          setCities(cJson.data);
          setSelectedCityIds((prev) => [...prev, resJson.data.id]);
        }
        setNewCityName("");
        setNewCityCode("");
      } else {
        alert(`Error: ${resJson.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCity(false);
    }
  };

  const handleDeleteCity = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menonaktifkan/menghapus kota "${name}" dari database?`)) {
      try {
        const res = await fetch(`/api/master/cities/${id}`, {
          method: "DELETE",
        });
        const resJson = await res.json();
        if (resJson.success) {
          const cRes = await fetch("/api/master/cities");
          const cJson = await cRes.json();
          if (cJson.success) {
            setCities(cJson.data);
            setSelectedCityIds((prev) => prev.filter((cId) => cId !== id));
            setHotelCityIds((prev) => prev.filter((cId) => cId !== id));
            // Update localStorage
            const saved = localStorage.getItem("hotel_city_ids");
            if (saved) {
              const parsed = JSON.parse(saved);
              const updated = parsed.filter((cId: string) => cId !== id);
              localStorage.setItem("hotel_city_ids", JSON.stringify(updated));
            }
          }
        } else {
          alert(`Error: ${resJson.message}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Paket Umroh</h1>
          <p className="text-muted-foreground mt-1">
            Manajemen elemen Master Data untuk referensi pembuatan paket umroh.
          </p>
        </div>
      </div>

      <Tabs tabs={TABS} defaultTab="jenis-paket">
        {(activeTab) => (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden mt-4">
            
            <div style={{ display: activeTab === "jenis-paket" ? "block" : "none" }}>
              <CrudTab
                title="Master Jenis Paket"
                itemName="Jenis Paket"
                apiEndpoint="/api/master/package-types"
                defaultNewItem={{ nama: "", kode: "", status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Jenis Paket" },
                  { key: "kode", header: "Kode Jenis Paket", render: (item) => <span className="font-mono font-semibold text-xs">{item.code || item.kode}</span> },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Jenis Paket", type: "text" },
                  { name: "kode", label: "Kode Jenis Paket", type: "text" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            </div>

            <div style={{ display: activeTab === "starting-point" ? "block" : "none" }}>
              <CrudTab
                title="Master Starting Point"
                itemName="Starting Point"
                apiEndpoint="/api/master/cities"
                defaultNewItem={{ nama: "", kode: "", status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Starting Point" },
                  { key: "kode", header: "Nama Singkat Starting", render: (item) => <span className="font-semibold text-xs text-muted-foreground">{item.code || item.kode}</span> },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Starting Point", type: "text" },
                  { name: "kode", label: "Nama Singkat Starting (Misal: JKT, SBY)", type: "text" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            </div>

            <div style={{ display: activeTab === "rute-in-out" ? "block" : "none" }}>
              <CrudTab
                title="Master Rute In-Out"
                itemName="Rute In-Out"
                initialData={MOCK_LANDING_PATTERN}
                defaultNewItem={{ ruteIn: "", ruteOut: "", kode: "", status: "Aktif" }}
                columns={[
                  { key: "ruteIn", header: "Rute In (Landing)" },
                  { key: "ruteOut", header: "Rute out (Take off)" },
                  { key: "kode", header: "Kode Rute", render: (item) => <span className="font-mono font-semibold text-xs">{item.kode}</span> },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "ruteIn", label: "Rute In (Landing)", type: "text" },
                  { name: "ruteOut", label: "Rute out (Take off)", type: "text" },
                  { name: "kode", label: "Kode Rute", type: "text" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            </div>

            <div style={{ display: activeTab === "maskapai" ? "block" : "none" }}>
              <CrudTab
                title="Master Maskapai"
                itemName="Maskapai"
                apiEndpoint="/api/master/airlines"
                defaultNewItem={{ nama: "", kode: "", status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Maskapai" },
                  { key: "kode", header: "Kode IATA" },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Maskapai", type: "text" },
                  { name: "kode", label: "Kode IATA Maskapai", type: "text" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            </div>

            <div style={{ display: activeTab === "hotel" ? "block" : "none" }}>
              <CrudTab
                title="Master Hotel"
                itemName="Hotel"
                apiEndpoint="/api/master/hotels"
                onSettingsClick={handleOpenSettings}
                defaultNewItem={{ nama: "", cityId: "", bintang: 5, status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Hotel" },
                  { 
                    key: "cityId", 
                    header: "Kota Lokasi", 
                    render: (item) => {
                      const city = cities.find(c => c.id === item.cityId);
                      return <span>{city ? city.name : item.cityId}</span>;
                    } 
                  },
                  { key: "bintang", header: "Rating Bintang", render: (item) => <span>{item.starRating || item.bintang || 5} ⭐</span> },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Hotel", type: "text" },
                  { name: "cityId", label: "Kota Lokasi", type: "select", options: cities.filter(c => hotelCityIds.includes(c.id)).map(c => ({ label: c.name, value: c.id })) },
                  { name: "bintang", label: "Rating Bintang (1-5)", type: "number" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
                filterField={{
                  name: "cityId",
                  label: "Kota Lokasi",
                  options: cities.filter(c => hotelCityIds.includes(c.id)).map(c => ({ label: c.name, value: c.id }))
                }}
              />
            </div>

            <div style={{ display: activeTab === "klaster" ? "block" : "none" }}>
              <CrudTab
                title="Master Klaster Seat"
                itemName="Klaster"
                initialData={MOCK_KLASTER}
                defaultNewItem={{ nama: "", status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Klaster" },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Klaster", type: "text" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            </div>

          </div>
        )}
      </Tabs>

      {/* Hotel City Settings Modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Pengaturan Kota Lokasi Hotel"
        description="Pilih kota-kota dari master data yang dapat dijadikan sebagai lokasi hotel dan filter dropdown."
      >
        <div className="space-y-4 mt-4">
          {/* Add City Inline Form */}
          <form onSubmit={handleAddCity} className="flex items-end gap-2 bg-muted/30 p-2.5 rounded-md border">
            <div className="flex-grow grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">Nama Kota Baru</label>
                <Input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="Misal: Riyadh"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground">Kode (Opsional)</label>
                <Input
                  type="text"
                  value={newCityCode}
                  onChange={(e) => setNewCityCode(e.target.value)}
                  placeholder="Misal: RUH"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="h-9 px-3 text-xs" disabled={addingCity}>
              {addingCity ? "..." : "Tambah"}
            </Button>
          </form>

          <div className="max-h-[250px] overflow-y-auto border rounded-md p-3 divide-y divide-border bg-card">
            {cities.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`hotel-city-${c.id}`}
                    checked={selectedCityIds.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCityIds((prev) => [...prev, c.id]);
                      } else {
                        setSelectedCityIds((prev) => prev.filter((id) => id !== c.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor={`hotel-city-${c.id}`}
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {c.name} <span className="text-xs text-muted-foreground font-semibold font-mono">({c.code})</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCity(c.id, c.name)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                  title="Hapus kota dari database"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSettings}>
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
