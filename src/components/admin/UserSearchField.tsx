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
  value: string;
  displayName: string;
  onChange: (id: string, name: string) => void;
  disabled?: boolean;
  label?: string;
}

export function UserSearchField({ value, displayName, onChange, disabled, label = "User" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["user-search", search],
    queryFn: () => fetchAdminResource<any>("users", { q: search, page_size: 20 }),
    enabled: open,
    staleTime: 10_000,
  });

  const users: { id: string; full_name: string; phone: string }[] = data?.results ?? [];

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label} <span className="text-destructive">*</span></Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            {value ? (displayName || value) : "Search and select a user…"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ minWidth: 340 }}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or phone…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isFetching && <div className="py-3 text-center text-xs text-muted-foreground">Searching…</div>}
              {!isFetching && users.length === 0 && <CommandEmpty>No users found.</CommandEmpty>}
              {users.map(u => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => {
                    onChange(u.id, u.full_name || "");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === u.id ? "opacity-100" : "opacity-0")} />
                  <div>
                    <span className="font-medium">{u.full_name || "—"}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">{u.phone}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {disabled && value && (
        <p className="text-[11px] text-muted-foreground">User cannot be changed after creation.</p>
      )}
    </div>
  );
}
