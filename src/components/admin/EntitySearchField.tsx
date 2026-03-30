import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminResource } from "@/lib/api";

interface Props {
  /** API resource slug, e.g. "restaurants", "riders", "parcel_agents" */
  resource: string;
  /** Field on the result object used as the primary label */
  labelKey: string;
  /** Optional field used as secondary (smaller) text */
  secondaryKey?: string;
  value: string;
  displayName: string;
  onChange: (id: string, label: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function EntitySearchField({
  resource, labelKey, secondaryKey, value, displayName,
  onChange, disabled, label, required, placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["entity-search", resource, search],
    queryFn: () => fetchAdminResource<any>(resource, { q: search, page_size: 20 }),
    enabled: open,
    staleTime: 10_000,
  });

  const results: Record<string, any>[] = data?.results ?? [];

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm">
          {label}{required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            {value ? (displayName || value) : (placeholder ?? `Search ${label ?? resource}…`)}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ minWidth: 340 }}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search…`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isFetching && <div className="py-3 text-center text-xs text-muted-foreground">Searching…</div>}
              {!isFetching && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
              {results.map(r => {
                const primary = r[labelKey] || r.name || r.id;
                const secondary = secondaryKey ? r[secondaryKey] : undefined;
                return (
                  <CommandItem
                    key={r.id}
                    value={r.id}
                    onSelect={() => {
                      onChange(r.id, primary || "");
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === r.id ? "opacity-100" : "opacity-0")} />
                    <div>
                      <span className="font-medium">{primary || "—"}</span>
                      {secondary && <span className="ml-2 text-xs text-muted-foreground">{secondary}</span>}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
