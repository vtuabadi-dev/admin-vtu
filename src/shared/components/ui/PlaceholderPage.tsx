import { Card, CardContent } from "@/shared/components/ui/Card";
import { Hammer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  currentSprint?: string;
  futureSprint?: string;
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon = Hammer,
  currentSprint,
  futureSprint,
}: PlaceholderPageProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <Card className="w-full max-w-md bg-muted/30 border-dashed">
        <CardContent className="flex flex-col items-center p-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {description}
          </p>
          
          <div className="flex flex-col gap-2 w-full text-sm">
            {currentSprint && (
              <div className="flex items-center justify-between rounded-md bg-background px-4 py-2 border">
                <span className="text-muted-foreground">Status Development:</span>
                <span className="font-medium text-foreground">Sedang Berjalan</span>
              </div>
            )}
            {futureSprint && (
              <div className="flex items-center justify-between rounded-md bg-background px-4 py-2 border">
                <span className="text-muted-foreground">Target Rilis:</span>
                <span className="font-medium text-foreground">{futureSprint}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
