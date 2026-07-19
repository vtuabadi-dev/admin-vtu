"use client";

import { useState, useEffect } from "react";
import { 
  MOCK_LANDING_PATTERN, 
  MOCK_KLASTER 
} from "@/shared/lib/mock-data";
import { Tabs } from "@/shared/components/ui/Tabs";
import { CrudTab } from "./components/CrudTab";

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

  useEffect(() => {
    fetch("/api/master/cities")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCities(res.data);
        }
      })
      .catch((err) => console.error("Failed to load cities for dropdown selection options", err));
  }, []);

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
            
            {activeTab === "jenis-paket" && (
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
            )}

            {activeTab === "starting-point" && (
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
            )}

            {activeTab === "rute-in-out" && (
              <CrudTab
                title="Master Rute In-Out"
                itemName="Rute In-Out"
                initialData={MOCK_LANDING_PATTERN}
                defaultNewItem={{ nama: "", rute: "", status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Rute" },
                  { key: "rute", header: "Rute Bandara" },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Rute", type: "text" },
                  { name: "rute", label: "Rute Bandara (Format: CGK-MED-JED-CGK)", type: "text" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            )}

            {activeTab === "maskapai" && (
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
            )}

            {activeTab === "hotel" && (
              <CrudTab
                title="Master Hotel"
                itemName="Hotel"
                apiEndpoint="/api/master/hotels"
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
                  { name: "cityId", label: "Kota Lokasi", type: "select", options: cities.map(c => ({ label: c.name, value: c.id })) },
                  { name: "bintang", label: "Rating Bintang (1-5)", type: "number" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
                filterField={{
                  name: "cityId",
                  label: "Kota Lokasi",
                  options: cities.map(c => ({ label: c.name, value: c.id }))
                }}
              />
            )}

            {activeTab === "klaster" && (
              <CrudTab
                title="Master Klaster Seat"
                itemName="Klaster"
                initialData={MOCK_KLASTER}
                defaultNewItem={{ nama: "", kapasitas: 45, status: "Aktif" }}
                columns={[
                  { key: "nama", header: "Nama Klaster" },
                  { key: "kapasitas", header: "Kapasitas Seat Max", render: (item) => <span>{item.kapasitas} Seat</span> },
                  { key: "status", header: "Status" },
                  { key: "actions", header: "Aksi" },
                ]}
                fields={[
                  { name: "nama", label: "Nama Klaster", type: "text" },
                  { name: "kapasitas", label: "Kapasitas Maksimal Seat", type: "number" },
                  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
                ]}
              />
            )}

          </div>
        )}
      </Tabs>
    </div>
  );
}
