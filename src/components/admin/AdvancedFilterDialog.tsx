import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export interface FilterField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean" | "date_range";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface AdvancedFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FilterField[];
  filters: Record<string, any>;
  onApply: (filters: Record<string, any>) => void;
  onClear: () => void;
}

export function AdvancedFilterDialog({ open, onOpenChange, fields, filters: initialFilters, onApply, onClear }: AdvancedFilterDialogProps) {
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const activeCount = Object.values(filters).filter(v => v !== "" && v !== undefined && v !== null && v !== false).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Advanced Filters
            {activeCount > 0 && <Badge variant="secondary" className="text-[10px]">{activeCount} active</Badge>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {fields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm">{field.label}</Label>
              {field.type === "text" && (
                <Input
                  value={filters[field.key] || ""}
                  onChange={e => updateFilter(field.key, e.target.value)}
                  placeholder={field.placeholder || `Filter by ${field.label.toLowerCase()}...`}
                  className="h-9"
                />
              )}
              {field.type === "number" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={filters[`${field.key}_min`] || ""}
                    onChange={e => updateFilter(`${field.key}_min`, e.target.value)}
                    placeholder="Min"
                    className="h-9"
                  />
                  <Input
                    type="number"
                    value={filters[`${field.key}_max`] || ""}
                    onChange={e => updateFilter(`${field.key}_max`, e.target.value)}
                    placeholder="Max"
                    className="h-9"
                  />
                </div>
              )}
              {field.type === "date" && (
                <Input
                  type="date"
                  value={filters[field.key] || ""}
                  onChange={e => updateFilter(field.key, e.target.value)}
                  className="h-9"
                />
              )}
              {field.type === "date_range" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters[`${field.key}_from`] || ""}
                    onChange={e => updateFilter(`${field.key}_from`, e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="date"
                    value={filters[`${field.key}_to`] || ""}
                    onChange={e => updateFilter(`${field.key}_to`, e.target.value)}
                    className="h-9"
                  />
                </div>
              )}
              {field.type === "select" && (
                <Select value={filters[field.key] || "__all__"} onValueChange={v => updateFilter(field.key, v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {field.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === "boolean" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={filters[field.key] || false}
                    onCheckedChange={v => updateFilter(field.key, v)}
                  />
                  <span className="text-sm text-muted-foreground">{filters[field.key] ? "Yes" : "No"}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => { const cleared: Record<string, any> = {}; setFilters(cleared); onClear(); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear All
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onApply(filters); onOpenChange(false); }}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
