import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { fetchMe } from "./api";
import { cachedClasses, cachedTasks } from "./offline-data";
import { useAuth } from "./auth-context";
import { queryKeys } from "./query-client";
import {
  createTask,
  deleteTask,
  toggleTask,
  type CreateTaskPayload,
  type ListTasksFilter,
} from "./tasks-api";

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
    queryFn: ({ signal }) => cachedClasses(token!, user!.id, user!.role, signal),
    networkMode: "always",
    retry: false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (token && user) void refetch();
  }, [token, user, refetch]));
  return query;
}

export function useTasksQuery(filter?: ListTasksFilter) {
  const { token, user } = useAuth();
  const filterKey = JSON.stringify(filter ?? {});
  const query = useQuery({
    queryKey: queryKeys.tasks(user?.id ?? "", filterKey),
    enabled: Boolean(token && user),
    queryFn: ({ signal }) => cachedTasks(token!, user!.id, filter, signal),
    networkMode: "always",
    retry: false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (token && user) void refetch();
  }, [token, user, refetch]));
  return query;
}

export function useCreateTaskMutation() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(token!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
    },
  });
}

export function useToggleTaskMutation() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => toggleTask(token!, taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
    },
  });
}

export function useDeleteTaskMutation() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(token!, taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
    },
  });
}
