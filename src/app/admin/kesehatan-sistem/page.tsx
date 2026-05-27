"use client";

import { useState, useEffect, useCallback } from "react";
import { Server, Database, Cpu, HardDrive, RefreshCw, CircleCheck, CircleAlert, CircleX, Clock, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { PermissionGuard } from "@/shared/components/PermissionGuard";

type ServiceStatus = "healthy" | "degraded" | "down";

interface ServiceHealth {
  name: string;
  container: string;
  status: ServiceStatus;
  endpoint?: string;
  uptime?: string;
  latency?: string;
  lastCheck: string;
  icon: React.ElementType;
  details: { label: string; value: string }[];
}

function simulateHealthData(): ServiceHealth[] {
  const now = new Date().toISOString();
  const hours = (n: number) => `${n} jam ${Math.floor(Math.random() * 59)} menit`;

  return [
    {
      name: "Frontend (Next.js)",
      container: "vtu-frontend",
      status: "healthy",
      endpoint: "http://localhost:3000/api/health",
      uptime: hours(12),
      latency: `${Math.floor(Math.random() * 20) + 5}ms`,
      lastCheck: now,
      icon: Server,
      details: [
        { label: "Node.js", value: "v22.x (Alpine)" },
        { label: "Output", value: "standalone" },
        { label: "Port", value: "3000" },
      ],
    },
    {
      name: "PostgreSQL",
      container: "vtu-postgres",
      status: "healthy",
      uptime: hours(36),
      latency: `${Math.floor(Math.random() * 8) + 1}ms`,
      lastCheck: now,
      icon: Database,
      details: [
        { label: "Versi", value: "PostgreSQL 16 (Alpine)" },
        { label: "Database", value: "vtu_operasional" },
        { label: "Port Internal", value: "5432" },
      ],
    },
    {
      name: "Redis",
      container: "vtu-redis",
      status: "healthy",
      uptime: hours(36),
      latency: `${Math.floor(Math.random() * 3) + 1}ms`,
      lastCheck: now,
      icon: Radio,
      details: [
        { label: "Versi", value: "Redis 7 (Alpine)" },
        { label: "Max Memory", value: "256 MB" },
        { label: "Policy", value: "allkeys-lru" },
      ],
    },
    {
      name: "Worker",
      container: "vtu-worker",
      status: "healthy",
      endpoint: "http://localhost:3001/health",
      uptime: hours(12),
      latency: `${Math.floor(Math.random() * 15) + 3}ms`,
      lastCheck: now,
      icon: Cpu,
      details: [
        { label: "Status", value: "Idle (waiting for queue)" },
        { label: "Port", value: "3001" },
        { label: "Queues", value: "Belum aktif" },
      ],
    },
  ];
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "healthy":
      return <CircleCheck className="h-5 w-5 text-success" />;
    case "degraded":
      return <CircleAlert className="h-5 w-5 text-warning" />;
    case "down":
      return <CircleX className="h-5 w-5 text-destructive" />;
  }
}

function StatusBadgeHealth({ status }: { status: ServiceStatus }) {
  const m: Record<ServiceStatus, { variant: "success" | "warning" | "destructive"; label: string }> = {
    healthy: { variant: "success", label: "Sehat" },
    degraded: { variant: "warning", label: "Menurun" },
    down: { variant: "destructive", label: "Down" },
  };
  const s = m[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function KesehatanSistemPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const data = simulateHealthData();
      setServices(data);
      setLastRefresh(new Date().toLocaleTimeString("id-ID"));
      setLoading(false);
    }, 600);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const overallStatus: ServiceStatus =
    healthyCount === services.length ? "healthy" : healthyCount > 0 ? "degraded" : "down";

  return (
    <PermissionGuard module="sistem">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kesehatan Sistem</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring status semua layanan dan container
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Overall status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <StatusIcon status={overallStatus} />
            <div>
              <p className="text-xs text-muted-foreground">Status Sistem</p>
              <p className="text-lg font-bold">
                {overallStatus === "healthy" ? "Semua Normal" : overallStatus === "degraded" ? "Menurun" : "Down"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Service Sehat</p>
            <p className="text-lg font-bold text-success">
              {healthyCount}/{services.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Uptime Frontend</p>
            <p className="text-lg font-bold">{services[0]?.uptime ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Refresh Terakhir</p>
              <p className="text-sm font-medium">{lastRefresh || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service details */}
      <div className="grid gap-4">
        {services.map((svc) => (
          <Card key={svc.name}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <svc.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{svc.name}</h3>
                        <StatusBadgeHealth status={svc.status} />
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{svc.container}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-0.5">
                      {svc.uptime && <p>Uptime: {svc.uptime}</p>}
                      {svc.latency && <p>Latensi: {svc.latency}</p>}
                      {svc.endpoint && <p className="font-mono text-[10px]">{svc.endpoint}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {svc.details.map((d) => (
                      <div key={d.label} className="rounded-md bg-muted/50 px-2.5 py-1.5 min-w-[100px]">
                        <p className="text-[10px] text-muted-foreground">{d.label}</p>
                        <p className="text-xs font-medium">{d.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resource summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Utilisasi Resource (Simulasi)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResourceBar label="CPU" used={35} total={100} unit="%" icon={Cpu} />
            <ResourceBar label="Memory" used={512} total={2048} unit="MB" icon={HardDrive} />
            <ResourceBar label="Disk Volume" used={2.3} total={20} unit="GB" icon={HardDrive} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Health check interval: 30 detik. Data diperbarui otomatis setiap 30 detik.
      </p>
    </div>
    </PermissionGuard>
  );
}

function ResourceBar({
  label, used, total, unit, icon: Icon,
}: {
  label: string; used: number; total: number; unit: string; icon: React.ElementType;
}) {
  const pct = Math.round((used / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="text-xs font-medium">
          {used} / {total} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-success"
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
