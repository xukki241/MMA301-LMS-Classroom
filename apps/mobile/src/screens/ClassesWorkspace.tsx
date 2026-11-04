import { useEffect, useRef, useState } from "react";
import { Alert, RefreshControl, StyleSheet, View } from "react-native";
import { Dialog, HelperText, Portal, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { AppButton } from "@/src/components/ui/AppButton";
import { ClassCard } from "@/src/components/ui/ClassCard";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ClassRequestError } from "@/src/components/ui/ClassRequestError";
import { FieldError } from "@/src/components/ui/FormFeedback";
import { SePayCheckoutWebView } from "@/src/components/payment/SePayCheckoutWebView";
import { useAuth } from "@/src/lib/auth-context";
import { useClassesQuery } from "@/src/lib/hooks";
import { createClass, joinClass, MIN_JOIN_FEE_VND, type LmsClass } from "@/src/lib/classes-api";
import {
  confirmDemoPayment,
  createClassJoinCheckout,
  formatVnd,
  type SePayCheckout,
} from "@/src/lib/payment-api";
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
  const [feeTier, setFeeTier] = useState<"free" | "paid">("free");
  const [feeText, setFeeText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<SePayCheckout | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [sepayWebVisible, setSepayWebVisible] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const afterJoined = async (item: LmsClass) => {
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
    setFeeTier("free");
    setFeeText("");
    setCheckout(null);
    setPayOpen(false);
    setSepayWebVisible(false);
    router.push({ pathname: "/class/[id]", params: { id: item.id } });
  };

  const mutation = useMutation({
    networkMode: "always",
    mutationFn: async (input: { value: string; joinFeeVnd: number }) => {
      if (!token || !user) throw new HttpError("Phiên đăng nhập đã hết hạn.", 401);
      if (user.role === "teacher") {
        return createClass(token, input.value, input.joinFeeVnd);
      }
      try {
        return await joinClass(token, input.value);
      } catch (error) {
        if (error instanceof HttpError && (error.status === 402 || error.code === "PAYMENT_REQUIRED")) {
          const next = await createClassJoinCheckout(token, input.value);
          return { __checkout: next } as unknown as LmsClass;
        }
        throw error;
      }
    },
    onSuccess: async (item) => {
      if (!mounted.current || !user) return;
      if (item && typeof item === "object" && "__checkout" in (item as object)) {
        const next = (item as unknown as { __checkout: SePayCheckout }).__checkout;
        setCheckout(next);
        setPayOpen(true);
        return;
      }
      await afterJoined(item);
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

  const confirmPayMutation = useMutation({
    mutationFn: async () => {
      if (!token || !checkout) throw new Error("Thiếu checkout");
      if (checkout.demo) {
        await confirmDemoPayment(token, checkout.transactionRef);
        return { mode: "demo" as const };
      }
      setPayOpen(false);
      setSepayWebVisible(true);
      return { mode: "live" as const };
    },
    onSuccess: async (result) => {
      if (result.mode === "demo") {
        notifySuccess();
        setPayOpen(false);
        setCheckout(null);
        void classesQuery.refetch();
        Alert.alert("Đã thanh toán", "Bạn đã vào lớp. Mở danh sách lớp để vào học.");
      }
    },
    onError: () => notifyError(),
  });

  const submit = () => {
    if (submitting.current || mutation.isPending) return;
    const value = draft.trim();
    mutation.reset();
    if (!value) {
      setInputError(isTeacher ? "Vui lòng nhập tên lớp học." : "Vui lòng nhập mã lớp học.");
      return;
    }
    let joinFeeVnd = 0;
    if (isTeacher && feeTier === "paid") {
      joinFeeVnd = Math.round(Number(feeText.replace(/[^\d]/g, "")) || 0);
      if (joinFeeVnd < MIN_JOIN_FEE_VND) {
        setFeeError("Phí tham gia tối thiểu 5.000đ.");
        return;
      }
    }
    setInputError(null);
    setFeeError(null);
    submitting.current = true;
    mutation.mutate({ value, joinFeeVnd });
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
      <Text testID="classes-workspace-title" style={typography.title}>
        {isTeacher ? "Lớp giảng dạy" : "Lớp của tôi"}
      </Text>
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
        <FieldError message={inputError} />
        {isTeacher ? (
          <>
            <SegmentedButtons
              value={feeTier}
              onValueChange={(value) => {
                const next = value === "paid" ? "paid" : "free";
                setFeeTier(next);
                setFeeError(null);
                if (next === "free") setFeeText("");
              }}
              buttons={[
                { value: "free", label: "Miễn phí" },
                { value: "paid", label: "Có phí" },
              ]}
            />
            {feeTier === "paid" ? (
              <TextInput
                mode="outlined"
                label="Phí tham gia (VND)"
                value={feeText}
                keyboardType="number-pad"
                disabled={mutation.isPending}
                error={Boolean(feeError)}
                onChangeText={(value) => {
                  setFeeText(value.replace(/[^\d]/g, ""));
                  setFeeError(null);
                }}
              />
            ) : null}
            <FieldError message={feeError} />
          </>
        ) : null}
        {mutation.isError ? (
          <ClassRequestError error={mutation.error} operation={isTeacher ? "create" : "join"} inline />
        ) : null}
        <HelperText type="info" visible>
          {isTeacher
            ? feeTier === "paid"
              ? "Lớp có phí: học sinh trả một lần khi vào lớp. Tài liệu trong lớp không khóa riêng."
              : "Lớp miễn phí — tài liệu trong lớp mở hết cho thành viên."
            : "Mã lớp 6 ký tự. Lớp có phí sẽ mở SePay trước khi vào."}
        </HelperText>
        <AppButton loading={mutation.isPending || confirmPayMutation.isPending} onPress={submit}>
          {isTeacher ? "Tạo lớp" : "Tham gia"}
        </AppButton>
      </View> : null}

      <Portal>
        <Dialog visible={payOpen} onDismiss={() => setPayOpen(false)}>
          <Dialog.Title>Thanh toán phí vào lớp</Dialog.Title>
          <Dialog.Content>
            <Text style={typography.body}>
              {checkout
                ? `${checkout.materialTitle} · ${formatVnd(checkout.amount)}`
                : "Đang tạo đơn…"}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setPayOpen(false)}>Hủy</AppButton>
            <AppButton loading={confirmPayMutation.isPending} onPress={() => confirmPayMutation.mutate()}>
              {checkout?.demo ? "Xác nhận demo" : "Thanh toán SePay"}
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {checkout && sepayWebVisible ? (
        <SePayCheckoutWebView
          visible={sepayWebVisible}
          checkoutUrl={checkout.checkoutUrl}
          title="Thanh toán phí vào lớp"
          onClose={() => {
            setSepayWebVisible(false);
            setCheckout(null);
            void classesQuery.refetch();
          }}
        />
      ) : null}

      {classesQuery.isPending ? (
        <ClassListSkeleton />
      ) : classesQuery.isError ? (
        <ClassRequestError error={classesQuery.error} operation="list" onRetry={() => void classesQuery.refetch()} />
      ) : classes.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title={isTeacher ? "Bạn chưa tạo lớp học nào." : "Bạn chưa tham gia lớp học nào."}
          subtitle={isTeacher ? "Tạo lớp đầu tiên bằng biểu mẫu phía trên." : "Nhập mã lớp phía trên để bắt đầu."}
        />
      ) : (
        classes.map((item, index) => (
          <ClassCard
            key={item.id}
            item={item}
            index={index}
            onPress={() => router.push({ pathname: "/class/[id]", params: { id: item.id } })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.xl, paddingBottom: spacing.xl },
});
