import { QueryClient } from "@tanstack/react-query";
import { HttpError } from "./http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  me: ["me"] as const,
  classes: ["classes"] as const,
  class: (id: string) => ["classes", id] as const,
  teacherClass: (userId: string, classId: string) => ["teacher", userId, classId] as const,
  exercises: (userId: string, classId: string) => ["teacher", userId, classId, "exercises"] as const,
  submissions: (userId: string, classId: string, exerciseId: string) => ["teacher", userId, classId, "submissions", exerciseId] as const,
  submission: (userId: string, classId: string, exerciseId: string, submissionId: string) => ["teacher", userId, classId, "submissions", exerciseId, submissionId] as const,
};
