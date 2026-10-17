import { createContext, useContext, useRef, type ReactNode } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { getClass } from "../../lib/classes-api";
import { queryKeys } from "../../lib/query-client";
import { HttpError } from "../../lib/http";
import { FailureScreen, LoadingScreen } from "./shared";
import { blocksScreen } from "./query-errors";

type TeacherContext = { token: string; userId: string; classId: string; className: string };
const Context = createContext<TeacherContext | null>(null);

export function useTeacherClass() {
  const context = useContext(Context);
  if (!context) throw new Error("Teacher screens require TeacherBoundary");
  return context;
}

export function TeacherBoundary({ children }: { children: ReactNode }) {
  const { loading, token, user } = useAuth();
  const params = useLocalSearchParams<{ classId: string }>();
  const classId = typeof params.classId === "string" ? params.classId : "";
  const validId = /^[a-f\d]{24}$/i.test(classId);
  const verifiedAccess = useRef("");
  const accessKey = `${user?.id}:${classId}:${token}`;
  const query = useQuery({
    queryKey: queryKeys.teacherClass(user?.id ?? "", classId),
    enabled: !loading && Boolean(token) && user?.role === "teacher" && validId,
    queryFn: ({ signal }) => getClass(token!, classId, signal),
    staleTime: 0,
    refetchOnMount: "always",
  });
  if (query.isSuccess && query.isFetchedAfterMount) verifiedAccess.current = accessKey;

  if (loading) return <LoadingScreen />;
  if (!token || !user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "teacher") return <FailureScreen error={new HttpError("", 403)} />;
  if (!validId) return <FailureScreen error={new HttpError("ID lớp không hợp lệ.", 400)} />;
  // Do not mount children from cached ownership until a fresh access check finishes.
  if (query.isPending || !query.isFetchedAfterMount) return <LoadingScreen />;
  if (query.isError && blocksScreen(query.error, Boolean(query.data) && verifiedAccess.current === accessKey)) {
    return <FailureScreen error={query.error} retry={() => void query.refetch()} />;
  }
  if (!query.data) return <LoadingScreen />;
  if (query.data.teacherId !== user.id) return <FailureScreen error={new HttpError("", 403)} />;
  return <Context.Provider value={{ token, userId: user.id, classId, className: query.data.name }}>
    {children}
  </Context.Provider>;
}
