import { useQuery } from "@tanstack/react-query";

import { fetchAdminResource } from "@/lib/api";

export function useAdminResource<T>(resource: string, params?: Record<string, string | number | boolean>) {
  return useQuery({
    queryKey: ["admin-resource", resource, params],
    queryFn: () => fetchAdminResource<T>(resource, params),
    enabled: Boolean(resource),
  });
}
