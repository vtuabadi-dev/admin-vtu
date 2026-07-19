"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message = "Gagal memuat data. Periksa koneksi jaringan atau database Anda.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex w-full items-center justify-center p-6 ${className}`}>
      <Card className="w-full max-w-md border-destructive/50 bg-destructive/5 shadow-sm">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {onRetry && (
              <Button onClick={onRetry} variant="destructive">
                Coba Lagi
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
