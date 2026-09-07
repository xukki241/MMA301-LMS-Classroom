import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";
import { listClasses } from "./classes-api";
import { useAuth } from "./auth-context";
import { queryKeys } from "./query-client";

export function useMeQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.me,
    enabled: Boolean(token),
    queryFn: ({ signal }) => fetchMe(token!, signal),
  });
}

export function useClassesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.classes,
    enabled: Boolean(token),
    queryFn: ({ signal }) => listClasses(token!, signal),
  });
}
