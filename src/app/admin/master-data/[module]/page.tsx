import { PlaceholderPage } from "@/shared/components/ui/PlaceholderPage";
import { Package, MapPin, Clock, PlaneLanding, PlaneTakeoff, Building2, Layers, Briefcase } from "lucide-react";

export default function MasterDataPlaceholderPage({ params }: { params: { module: string } }) {
  const moduleMap: Record<string, { title: string; icon: any; sprint: string }> = {
    "jenis-paket": { title: "Jenis Paket", icon: Package, sprint: "Sprint 2" },
    "starting-point": { title: "Starting Point", icon: MapPin, sprint: "Roadmap" },
    "lama-perjalanan": { title: "Lama Perjalanan", icon: Clock, sprint: "Roadmap" },
    "landing-pattern": { title: "Landing Pattern", icon: PlaneLanding, sprint: "Roadmap" },
    "maskapai": { title: "Maskapai", icon: PlaneTakeoff, sprint: "Roadmap" },
    "hotel": { title: "Hotel", icon: Building2, sprint: "Roadmap" },
    "klaster": { title: "Klaster", icon: Layers, sprint: "Roadmap" },
    "perlengkapan": { title: "Perlengkapan", icon: Briefcase, sprint: "Roadmap" },
  };

  const current = moduleMap[params.module] || { 
    title: params.module, 
    icon: Package, 
    sprint: "Roadmap" 
  };

  return (
    <PlaceholderPage
      title={`Master ${current.title}`}
      description={`Modul Master ${current.title} sedang dalam tahap pengembangan sesuai dengan desain arsitektur yang telah disetujui.`}
      icon={current.icon}
      futureSprint={current.sprint}
    />
  );
}
