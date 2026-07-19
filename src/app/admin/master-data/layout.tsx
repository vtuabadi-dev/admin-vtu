import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master Data | VTU Operational System",
  description: "Kelola data referensi utama sistem ERP VTU Abadi",
};

export default function MasterDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">Master Data Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Single Source of Truth untuk data referensi paket umroh
        </p>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}
