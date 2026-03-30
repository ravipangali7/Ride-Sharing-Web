import { ReactNode, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterPill {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  statusFilters?: FilterPill[];
  activeStatus?: string;
  onStatusChange?: (v: string) => void;
  onAdvancedFilter?: () => void;
  advancedFilterCount?: number;
  extra?: ReactNode;
  className?: string;
}

export function FilterBar({ searchPlaceholder = "Search...", onSearch, statusFilters, activeStatus = "all", onStatusChange, onAdvancedFilter, advancedFilterCount = 0, extra, className }: FilterBarProps) {
  const [search, setSearch] = useState("");

  const handleSearch = (v: string) => {
    setSearch(v);
    onSearch?.(v);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9 rounded-lg bg-muted/50"
        />
        {search && (
          <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {statusFilters && (
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => onStatusChange?.(f.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeStatus === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {extra}
      <Button variant="outline" size="sm" className="ml-auto h-9 gap-1.5" onClick={onAdvancedFilter}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Advanced Filters
        {advancedFilterCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{advancedFilterCount}</Badge>}
      </Button>
    </div>
  );
}
