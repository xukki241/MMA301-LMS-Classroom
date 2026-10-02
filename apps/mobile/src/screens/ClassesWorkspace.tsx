import { useEffect, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { ClassCard } from "@/src/components/ui/ClassCard";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { useAuth } from "@/src/lib/auth-context";
import { useClassesQuery } from "@/src/lib/hooks";
import { createClass, joinClass, type LmsClass } from "@/src/lib/classes-api";
import { HttpError } from "@/src/lib/http";
import { queryKeys } from "@/src/lib/query-client";
import { notifyError, notifySuccess } from "@/src/lib/haptics";
import { spacing, typography } from "@/src/theme/tokens";

export function ClassesWorkspace() {
  const theme = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const classesQuery = useClassesQuery();
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      if (!token || !user) throw new HttpError("Phiên đăng nhập đã hết hạn.", 401);
      return user.role === "teacher" ? createClass(token, value) : joinClass(token, value);
    },
    onSuccess: async (item) => {
      if (!mounted.current || !user) return;
      const listKey = queryKeys.classList(user.id, user.role);
      await queryClient.cancelQueries({ queryKey: listKey });
      if (!mounted.current) return;
      queryClient.setQueryData<LmsClass[]>(listKey, (previous = []) =>
        [item, ...previous.filter((entry) => entry.id !== item.id)]
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes(user.id) });
      notifySuccess();
      setDraft("");
      router.push({ pathname: "/class/[id]", params: { id: item.id } });
    },
    onError: (error) => {
      if (!mounted.current) return;
      notifyError();
      if (user && error instanceof HttpError && (error.code === "ALREADY_JOINED" || error.status === 409)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.classes(user.id) });
      }
    },
    onSettled: () => { submitting.current = false; },
  });

  const submit = () => {
    if (submitting.current || mutation.isPending) return;
    const value = draft.trim();
    mutation.reset();
    if (!value) {
      setInputError(isTeacher ? "Vui lòng nhập tên lớp học." : "Vui lòng nhập mã lớp học.");
      return;
    }
    setInputError(null);
    submitting.current = true;
    mutation.mutate(value);
  };

  const classes = classesQuery.data ?? [];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={classesQuery.isRefetching}
          onRefresh={() => void classesQuery.refetch()}
          tintColor={theme.colors.primary}
        />
      }
    >
      <Text style={typography.title}>{isTeacher ? "Lớp giảng dạy" : "Lớp của tôi"}</Text>
      <Text style={[typography.body, { color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }]}>
        {isTeacher ? "Tạo lớp mới và chia sẻ mã lớp với học sinh." : "Nhập mã lớp do giáo viên cung cấp."}
      </Text>

      {user ? <View style={styles.form}>
        <TextInput
          mode="outlined"
          label={isTeacher ? "Tên lớp" : "Mã lớp"}
          value={draft}
          autoCapitalize={isTeacher ? "sentences" : "characters"}
          autoCorrect={isTeacher}
          disabled={mutation.isPending}
          error={Boolean(inputError) || mutation.isError}
          returnKeyType="done"
          onSubmitEditing={submit}
          onChangeText={(value) => {
            setDraft(value);
            setInputError(null);
            mutation.reset();
          }}
        />
        <HelperText type="info" visible>
          {isTeacher ? "Tên lớp tối đa 100 ký tự." : "Mã lớp gồm 6 ký tự."}
        </HelperText>
        <AppButton loading={mutation.isPending} onPress={submit}>
          {isTeacher ? "Tạo lớp" : "Tham gia"}
        </AppButton>
        {inputError ? <HelperText type="error" visible>{inputError}</HelperText> : null}
        {mutation.isError ? (
          <ClassRequestError error={mutation.error} operation={isTeacher ? "create" : "join"} inline />
        ) : null}
      </View> : null}

      {classesQuery.isPending ? <ClassListSkeleton /> : null}
      {classesQuery.isError ? (
        <ClassRequestError error={classesQuery.error} operation="list" onRetry={() => void classesQuery.refetch()} />
      ) : null}
      {classesQuery.isSuccess && classes.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title={isTeacher ? "Bạn chưa tạo lớp học nào." : "Bạn chưa tham gia lớp học nào."}
          subtitle={isTeacher ? "Tạo lớp đầu tiên bằng biểu mẫu phía trên." : "Nhập mã lớp phía trên để bắt đầu."}
        />
      ) : null}
      {!classesQuery.isError && classes.map((item, index) => (
        <ClassCard
          key={item.id}
          item={item}
          index={index}
          onPress={() => router.push({ pathname: "/class/[id]", params: { id: item.id } })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.xl },
});
