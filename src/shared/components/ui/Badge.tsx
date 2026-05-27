import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",
        outline: "text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

// --- Domain-specific status badge helpers ---

const statusColorMap: Record<string, BadgeProps["variant"]> = {
  lengkap: "success",
  verified: "success",
  lunas: "success",
  paid: "success",
  ready: "success",
  completed: "success",
  departed: "info",
  active: "success",

  kurang: "warning",
  revisi: "warning",
  pending: "warning",
  partial: "warning",
  cicilan: "warning",
  dp: "info",
  hampir_lunas: "info",
  preparing: "warning",
  scheduled: "info",
  draft: "muted",

  rejected: "destructive",
  overdue: "destructive",
  cancelled: "destructive",
  batal: "destructive",
  kadaluarsa: "destructive",
};

const statusLabelMap: Record<string, string> = {
  lengkap: "Lengkap",
  kurang: "Kurang",
  revisi: "Revisi",
  pending: "Pending",
  verified: "Terverifikasi",
  rejected: "Ditolak",
  lunas: "Lunas",
  cicilan: "Cicilan",
  dp: "DP",
  hampir_lunas: "Hampir Lunas",
  overdue: "Overdue",
  paid: "Lunas",
  partial: "Sebagian",
  unpaid: "Belum Bayar",
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Batal",
  draft: "Draft",
  final: "Final",
  submitted: "Terkirim",
  scheduled: "Terjadwal",
  preparing: "Persiapan",
  ready: "Siap",
  departed: "Berangkat",
  registered: "Terdaftar",
  dokumen_upload: "Upload Dokumen",
  dokumen_verified: "Dokumen OK",
  dokumen_revisi: "Revisi Dokumen",
  pembayaran_pending: "Bayar Pending",
  berangkat: "Berangkat",
  sent: "Terkirim",
  read: "Dibaca",
  responded: "Direspon",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const variant = statusColorMap[status] ?? "default";
  const label = statusLabelMap[status] ?? status;

  return (
    <Badge variant={variant} className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}
