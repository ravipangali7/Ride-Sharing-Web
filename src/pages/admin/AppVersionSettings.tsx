import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  fetchAdminResource,
  patchAdminResourceMultipart,
  publicMediaUrl,
} from "@/lib/api";
import { toast } from "sonner";
import { Smartphone, Save, ExternalLink } from "lucide-react";

const RESOURCE = "mobile_app_release";

interface ReleaseRow {
  id: string;
  current_app_version: number;
  android_file: string | null;
  updated_at?: string;
}

export default function AppVersionSettings() {
  const queryClient = useQueryClient();
  const [versionInput, setVersionInput] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", RESOURCE],
    queryFn: () => fetchAdminResource<ReleaseRow>(RESOURCE, { page_size: 1 }),
  });

  const row = data?.results?.[0];

  useEffect(() => {
    if (row) {
      setVersionInput(String(row.current_app_version));
    }
  }, [row]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!row?.id) throw new Error("No release config row loaded");
      const fd = new FormData();
      fd.append("current_app_version", String(parseInt(versionInput, 10) || 1));
      if (file) fd.append("android_file", file);
      setUploadPct(0);
      try {
        return await patchAdminResourceMultipart<ReleaseRow>(
          RESOURCE,
          row.id,
          fd,
          (p) => setUploadPct(p),
        );
      } finally {
        setUploadPct(null);
        setFile(null);
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      void queryClient.invalidateQueries({ queryKey: ["admin", RESOURCE] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Save failed");
    },
  });

  const apkHref = publicMediaUrl(row?.android_file ?? null);

  return (
    <AdminLayout>
      <div className="max-w-lg space-y-8 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-primary" />
            App version
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set the current Android build code and upload the APK. Clients compare against this
            version.
          </p>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {(error as Error).message || "Failed to load"}
          </p>
        )}

        {row && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="current_app_version">Current app version (integer)</Label>
              <Input
                id="current_app_version"
                type="number"
                min={1}
                value={versionInput}
                onChange={(e) => setVersionInput(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="android_file">Android APK</Label>
              <Input
                id="android_file"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {apkHref && (
                <a
                  href={apkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Current file in media
                </a>
              )}
              {!apkHref && (
                <p className="text-xs text-muted-foreground">No APK uploaded yet.</p>
              )}
            </div>

            {uploadPct !== null && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Uploading…</p>
                <Progress value={uploadPct} className="h-2" />
              </div>
            )}

            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
