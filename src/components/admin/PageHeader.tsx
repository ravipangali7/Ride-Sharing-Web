import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  createLabel?: string;
  onCreate?: () => void;
  onExport?: () => void;
  extra?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, createLabel, onCreate, onExport, extra, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        )}
        {onCreate && (
          <Button size="sm" onClick={onCreate} className="gap-1.5 gradient-primary border-0">
            <Plus className="h-3.5 w-3.5" /> {createLabel || "Create New"}
          </Button>
        )}
      </div>
    </div>
  );
}
