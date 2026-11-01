import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect, useIsFocused } from "expo-router";
import { fetchMe } from "./api";
import { cachedClasses } from "./offline-data";
import { fetchOverview } from "./overview-api";
import { useAuth } from "./auth-context";
import { queryKeys } from "./query-client";

const OVERVIEW_POLL_MS = 20_000;

function useAppIsActive() {
  const [active, setActive] = useState(() => AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
    });
    return () => subscription.remove();
  }, []);
  return active;
}

export function useMeQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.me,
    enabled: Boolean(token),
    queryFn: ({ signal }) => fetchMe(token!, signal),
  });
}

/** Dữ liệu gộp cho Trang chủ, Lịch và Việc; làm mới khi tab được focus và khi màn đang mở. */
export function useOverviewQuery() {
  const { token, user } = useAuth();
  const focused = useIsFocused();
  const appActive = useAppIsActive();
  const query = useQuery({
    queryKey: queryKeys.overview(user?.id ?? ""),
    enabled: Boolean(token && user),
    queryFn: ({ signal }) => fetchOverview(token!, signal),
    networkMode: "always",
    retry: false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    // cancelRefetch:false giữ lại lượt tải đang chạy thay vì hủy nó; http() gộp các GET
    // trùng nhau nên một lượt bị hủy sẽ làm hỏng cả lượt tải thay thế.
    if (token && user) void refetch({ cancelRefetch: false });
  }, [token, user, refetch]));
  useEffect(() => {
    if (!token || !user || !focused || !appActive) return;
    const timer = setInterval(() => {
      void refetch({ cancelRefetch: false });
    }, OVERVIEW_POLL_MS);
    return () => clearInterval(timer);
  }, [token, user, focused, appActive, refetch]);
  return query;
}

export function useClassesQuery() {
  const { token, user } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.classList(user?.id ?? "", user?.role ?? ""),
    enabled: Boolean(token && user),
    queryFn: ({ signal }) => cachedClasses(token!, user!.id, user!.role, signal),
    networkMode: "always",
    retry: false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (token && user) void refetch({ cancelRefetch: false });
  }, [token, user, refetch]));
  return query;
}
