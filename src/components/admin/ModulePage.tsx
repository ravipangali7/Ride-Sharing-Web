import { ReactNode, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatsBar } from "@/components/admin/StatsBar";
import { FilterBar } from "@/components/admin/FilterBar";
import { DataTable, Column } from "@/components/admin/DataTable";
import { AdvancedFilterDialog, FilterField } from "@/components/admin/AdvancedFilterDialog";
import { motion } from "framer-motion";

interface ModulePageProps<T> {
  title: string;
  subtitle?: string;
  createLabel?: string;
  stats: { label: string; value: string | number; trend?: { value: string; up: boolean }; pulse?: boolean }[];
  statusFilters?: { label: string; value: string }[];
  searchPlaceholder?: string;
  columns: Column<T>[];
  data: T[];
  chart?: ReactNode;
  onCreate?: () => void;
  onRowClick?: (row: T) => void;
  extra?: ReactNode;
  advancedFilterFields?: FilterField[];
  advancedFilters?: Record<string, any>;
  onAdvancedFilterApply?: (filters: Record<string, any>) => void;
  onAdvancedFilterClear?: () => void;
  onSearch?: (q: string) => void;
  activeStatus?: string;
  onStatusChange?: (v: string) => void;
}

export function ModulePage<T extends Record<string, any>>({
  title, subtitle, createLabel, stats, statusFilters, searchPlaceholder, columns, data, chart, onCreate, onRowClick, extra,
  advancedFilterFields, advancedFilters, onAdvancedFilterApply, onAdvancedFilterClear, onSearch, activeStatus, onStatusChange
}: ModulePageProps<T>) {
  const [advFilterOpen, setAdvFilterOpen] = useState(false);

  const advFilterCount = advancedFilters ? Object.values(advancedFilters).filter(v => v !== "" && v !== undefined && v !== null && v !== false).length : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title={title} subtitle={subtitle} createLabel={createLabel} onCreate={onCreate || (() => {})} onExport={() => {}} />
        <StatsBar stats={stats} className="!grid-cols-2 sm:!grid-cols-3 lg:!grid-cols-6" />
        {chart && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border bg-card p-5">
            {chart}
          </motion.div>
        )}
        <FilterBar
          searchPlaceholder={searchPlaceholder}
          statusFilters={statusFilters}
          activeStatus={activeStatus || "all"}
          onStatusChange={onStatusChange}
          onSearch={onSearch}
          onAdvancedFilter={() => setAdvFilterOpen(true)}
          advancedFilterCount={advFilterCount}
        />
        <DataTable columns={columns} data={data} onRowClick={onRowClick} />
        {extra}
      </div>
      {advancedFilterFields && (
        <AdvancedFilterDialog
          open={advFilterOpen}
          onOpenChange={setAdvFilterOpen}
          fields={advancedFilterFields}
          filters={advancedFilters || {}}
          onApply={onAdvancedFilterApply || (() => {})}
          onClear={onAdvancedFilterClear || (() => {})}
        />
      )}
    </AdminLayout>
  );
}
