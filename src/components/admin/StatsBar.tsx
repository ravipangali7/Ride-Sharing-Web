import { ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCard {
  label: string;
  value: string | number;
  trend?: { value: string; up: boolean };
  icon?: ReactNode;
  pulse?: boolean;
}

interface StatsBarProps {
  stats: StatCard[];
  className?: string;
}

export function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 6)}, 1fr)` }}>
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            {stat.icon && <span className="text-muted-foreground">{stat.icon}</span>}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold tracking-tight", stat.pulse && "flex items-center gap-2")}>
              {stat.value}
              {stat.pulse && <span className="h-2 w-2 rounded-full bg-emerald animate-pulse-dot" />}
            </span>
            {stat.trend && (
              <span className={cn("flex items-center text-xs font-medium", stat.trend.up ? "text-emerald" : "text-rose")}>
                {stat.trend.up ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {stat.trend.value}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
