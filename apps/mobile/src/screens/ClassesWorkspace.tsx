import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { ClassCard } from "@/src/components/ui/ClassCard";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { useAuth } from "@/src/lib/auth-context";
import { useClassesQuery } from "@/src/lib/hooks";
import { createClass, joinClass } from "@/src/lib/classes-api";
import { isNotFound } from "@/src/lib/http";
import { queryKeys } from "@/src/lib/query-client";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export function ClassesWorkspace({ role }: { role: "teacher" | "student" }) {
  const theme = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const classesQuery = useClassesQuery();
  const [draft, setDraft] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Thiếu phiên đăng nhập");
      const value = draft.trim();
      if (!value) throw new Error(role === "teacher" ? "Nhập tên lớp" : "Nhập mã lớp");
      return role === "teacher" ? createClass(token, value) : joinClass(token, value.toUpperCase());
    },
    onSuccess: async () => {
      notifySuccess();
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.classes });
    },
    onError: () => notifyError(),
  });

  const classes = classesQuery.data ?? [];
  const missingApi = isNotFound(classesQuery.error);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={classesQuery.isRefetching && !classesQuery.isPending}
          onRefresh={() => void classesQuery.refetch()}
          tintColor={theme.colors.primary}
        />
      }
    >
      <Text style={typography.title}>{role === "teacher" ? "Lớp giảng dạy" : "Lớp của tôi"}</Text>
      <Text style={[typography.body, { color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }]}>
        {role === "teacher" ? "Tạo lớp mới, hệ thống sẽ phát sinh mã tham gia." : "Nhập mã lớp do giáo viên cung cấp."}
      </Text>

      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label={role === "teacher" ? "Tên lớp" : "Mã lớp"}
          value={draft}
          autoCapitalize={role === "teacher" ? "sentences" : "characters"}
          onChangeText={setDraft}
        />
        <AppButton loading={mutation.isPending} onPress={() => mutation.mutate()}>
          {role === "teacher" ? "Tạo lớp" : "Tham gia"}
        </AppButton>
        {mutation.isError ? (
          <HelperText type="error" visible>
            {mutation.error.message}
          </HelperText>
        ) : null}
      </View>

      {classesQuery.isPending ? <ClassListSkeleton /> : null}

      {classesQuery.isError && !missingApi ? (
        <ErrorState message={classesQuery.error.message} onRetry={() => void classesQuery.refetch()} />
      ) : null}

      {!classesQuery.isPending && (missingApi || classes.length === 0) && !classesQuery.isError ? (
        <EmptyState
          icon="book-outline"
          title="Danh sách đang trống"
          subtitle="Kéo xuống để làm mới khi API lớp đã sẵn sàng."
        />
      ) : null}

      {missingApi ? (
        <EmptyState
          icon="construct-outline"
          title="API lớp chưa có trên Core"
          subtitle="UI list/detail đã sẵn. Không dùng dữ liệu giả từ backend."
        />
      ) : null}

      {classes.map((item, index) => (
        <ClassCard
          key={item.id}
          item={item}
          index={index}
          onPress={() =>
            router.push({ pathname: "/class/[id]", params: { id: item.id, name: item.name, code: item.code } })
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.xl },
});
