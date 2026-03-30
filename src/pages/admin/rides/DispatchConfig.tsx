import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useUpdateResource } from "@/hooks/useAdminMutations";
import { toast } from "sonner";

export default function DispatchConfig() {
  const { data } = useAdminResource<any>("dispatch_config", { page_size: 1 });
  const cfg = data?.results?.[0];
  const updateMutation = useUpdateResource("dispatch_config");

  const [strategy, setStrategy] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});

  const effectiveStrategy = strategy ?? cfg?.dispatch_strategy ?? "mixed";
  const getWeight = (key: string, fallback: number) =>
    weights[key] !== undefined ? weights[key] : Number(cfg?.[key] ?? fallback);

  const weightDefs = [
    { key: "proximity_weight", label: "Proximity Weight", fallback: 0.4 },
    { key: "rating_weight", label: "Rating Weight", fallback: 0.25 },
    { key: "behavior_weight", label: "Behavior Weight", fallback: 0.2 },
    { key: "trip_count_weight", label: "Trip Count Weight", fallback: 0.15 },
  ];

  const handleSave = () => {
    if (!cfg?.id) { toast.error("No dispatch config found. Create one first."); return; }
    const payload: Record<string, any> = { dispatch_strategy: effectiveStrategy };
    weightDefs.forEach(w => { payload[w.key] = getWeight(w.key, w.fallback); });
    updateMutation.mutate({ id: cfg.id, data: payload }, {
      onSuccess: () => toast.success("Dispatch configuration saved"),
    });
  };

  const handleReset = () => {
    setStrategy(null);
    setWeights({});
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="Dispatch Configuration" subtitle="Configure rider dispatch priority weights" />
        <div className="rounded-xl border bg-card p-6 space-y-8 max-w-2xl">
          <div>
            <Label className="text-sm font-medium">Dispatch Strategy</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {["proximity_first", "rating_first", "behavior_score", "fair_rotation", "mixed"].map(s => (
                <label key={s} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    checked={effectiveStrategy === s}
                    onChange={() => setStrategy(s)}
                    className="accent-primary"
                  />
                  <span className="text-sm capitalize">{s.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>
          {weightDefs.map(w => {
            const val = getWeight(w.key, w.fallback);
            return (
              <div key={w.key}>
                <div className="flex justify-between mb-2">
                  <Label>{w.label}</Label>
                  <span className="text-sm font-mono">{val.toFixed(2)}</span>
                </div>
                <Slider
                  value={[Math.round(val * 100)]}
                  onValueChange={([v]) => setWeights(prev => ({ ...prev, [w.key]: v / 100 }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            );
          })}
          <div className="flex gap-3 pt-4">
            <Button className="gradient-primary border-0" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Configuration"}
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
