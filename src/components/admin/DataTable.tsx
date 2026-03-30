import { useState, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick, className }: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [perPage] = useState(10);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const totalPages = Math.ceil(data.length / perPage);
  const pageData = data.slice(page * perPage, (page + 1) * perPage);

  const toggleAll = () => {
    if (selected.size === pageData.length) setSelected(new Set());
    else setSelected(new Set(pageData.map((_, i) => i)));
  };

  const toggleRow = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-3 py-3">
                <Checkbox checked={selected.size === pageData.length && pageData.length > 0} onCheckedChange={toggleAll} />
              </th>
              {columns.map(col => (
                <th key={col.key} className={cn("px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider", col.className)}>
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="text-center py-12 text-muted-foreground">No records found</td></tr>
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b last:border-0 transition-colors hover:bg-muted/30 cursor-pointer",
                    selected.has(i) && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleRow(i)} />
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className={cn("px-3 py-3", col.className)}>
                      {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">
                    <button className="text-xs font-medium text-primary hover:underline">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
          <span>{data.length} total records</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-muted disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={cn("min-w-[28px] h-7 rounded text-xs", page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="p-1 rounded hover:bg-muted disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
