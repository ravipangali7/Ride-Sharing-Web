import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createAdminResource,
  updateAdminResource,
  deleteAdminResource,
} from "@/lib/api";

export function useCreateResource<T = any>(resource: string) {
  const qc = useQueryClient();
  return useMutation<T, Error, Record<string, any>>({
    mutationFn: (data) => createAdminResource<T>(resource, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-resource", resource] }),
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateResource<T = any>(resource: string) {
  const qc = useQueryClient();
  return useMutation<T, Error, { id: string; data: Record<string, any> }>({
    mutationFn: ({ id, data }) => updateAdminResource<T>(resource, id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-resource", resource] }),
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteResource(resource: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteAdminResource(resource, id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-resource", resource] }),
    onError: (e) => toast.error(e.message),
  });
}
