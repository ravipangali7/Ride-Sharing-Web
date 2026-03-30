import { cn } from "@/lib/utils";

type StatusType = 'active' | 'approved' | 'completed' | 'success' | 'delivered' | 'paid' |
  'pending' | 'searching' | 'in_progress' | 'preparing' | 'ready' | 'reminded' |
  'cancelled' | 'failed' | 'rejected' | 'closed' |
  'bargaining' | 'dispatching' | 'accepted' | 'confirmed' | 'ongoing' | 'quoted' |
  'online' | 'offline' | 'open' | 'inactive' |
  'started' | 'arrived' | 'picked_up' | 'in_transit' | 'generated' | 'missed' |
  'high' | 'medium' | 'low' | string;

const statusConfig: Record<string, { bg: string; text: string; dot?: string }> = {
  active: { bg: 'bg-emerald/10', text: 'text-emerald', dot: 'bg-emerald' },
  approved: { bg: 'bg-emerald/10', text: 'text-emerald' },
  completed: { bg: 'bg-emerald/10', text: 'text-emerald' },
  success: { bg: 'bg-emerald/10', text: 'text-emerald' },
  delivered: { bg: 'bg-emerald/10', text: 'text-emerald' },
  paid: { bg: 'bg-emerald/10', text: 'text-emerald' },
  online: { bg: 'bg-emerald/10', text: 'text-emerald', dot: 'bg-emerald' },
  open: { bg: 'bg-emerald/10', text: 'text-emerald' },

  pending: { bg: 'bg-amber/10', text: 'text-amber' },
  searching: { bg: 'bg-amber/10', text: 'text-amber' },
  in_progress: { bg: 'bg-amber/10', text: 'text-amber' },
  preparing: { bg: 'bg-amber/10', text: 'text-amber' },
  ready: { bg: 'bg-amber/10', text: 'text-amber' },
  reminded: { bg: 'bg-amber/10', text: 'text-amber' },
  medium: { bg: 'bg-amber/10', text: 'text-amber' },

  cancelled: { bg: 'bg-rose/10', text: 'text-rose' },
  failed: { bg: 'bg-rose/10', text: 'text-rose' },
  rejected: { bg: 'bg-rose/10', text: 'text-rose' },
  closed: { bg: 'bg-rose/10', text: 'text-rose' },
  high: { bg: 'bg-rose/10', text: 'text-rose' },
  inactive: { bg: 'bg-rose/10', text: 'text-rose' },

  bargaining: { bg: 'bg-violet/10', text: 'text-violet' },
  dispatching: { bg: 'bg-violet/10', text: 'text-violet' },
  accepted: { bg: 'bg-sky/10', text: 'text-sky' },
  confirmed: { bg: 'bg-sky/10', text: 'text-sky' },
  ongoing: { bg: 'bg-sky/10', text: 'text-sky' },
  quoted: { bg: 'bg-sky/10', text: 'text-sky' },
  started: { bg: 'bg-sky/10', text: 'text-sky' },
  arrived: { bg: 'bg-sky/10', text: 'text-sky' },
  picked_up: { bg: 'bg-sky/10', text: 'text-sky' },
  in_transit: { bg: 'bg-sky/10', text: 'text-sky' },
  generated: { bg: 'bg-sky/10', text: 'text-sky' },

  offline: { bg: 'bg-muted', text: 'text-muted-foreground' },
  missed: { bg: 'bg-muted', text: 'text-muted-foreground' },
  low: { bg: 'bg-sky/10', text: 'text-sky' },
};

interface StatusBadgeProps {
  status: StatusType;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, pulse, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-muted', text: 'text-muted-foreground' };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
      config.bg, config.text, className
    )}>
      {(pulse || config.dot) && (
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dot || config.text, pulse && "animate-pulse-dot")} />
      )}
      {label}
    </span>
  );
}
