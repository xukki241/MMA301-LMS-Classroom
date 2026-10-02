import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
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
  const { token, user } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.classList(user?.id ?? "", user?.role ?? ""),
    enabled: Boolean(token && user),
    queryFn: ({ signal }) => listClasses(token!, user!.role, signal),
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (token && user) void refetch();
  }, [token, user, refetch]));
  return query;
}
