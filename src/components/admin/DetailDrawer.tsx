import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function DetailDrawer({ open, onClose, title, subtitle, children, className }: DetailDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className={cn(
        "fixed top-0 right-0 h-full w-full max-w-[640px] bg-card border-l shadow-2xl z-50 flex flex-col animate-slide-in-right",
        "md:w-[640px]",
        className
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>
      </div>
    </>
  );
}
