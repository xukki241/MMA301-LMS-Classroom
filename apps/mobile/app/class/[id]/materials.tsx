import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Dialog,
  FAB,
  Icon,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { FieldError, FormDialogScroll, FormNotice, keyboardBehavior, useKeyboardLift } from "@/src/components/ui/FormFeedback";
import {
  SePayCheckoutWebView,
  type SePayReturnResult,
} from "@/src/components/payment/SePayCheckoutWebView";
import { useAuth } from "@/src/lib/auth-context";
import { userErrorMessage } from "@/src/lib/user-error-message";
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  listMaterials,
  type LmsMaterial,
} from "@/src/lib/materials-api";
import {
  confirmDemoPayment,
  createMaterialCheckout,
  formatVnd,
  type SePayCheckout,
} from "@/src/lib/payment-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
import { CloudinaryFilePicker } from "@/src/components/ui/CloudinaryFilePicker";
import { isSafeHttpUrl } from "@/src/lib/safe-url";
import { elevation, palette, radius, spacing, typography } from "@/src/theme/tokens";

/**
 * Phân tích icon phù hợp dựa trên URL
 */
function getUrlMeta(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes("drive.google.com") || lower.includes("docs.google.com")) {
    return { icon: "logo-google" as const, label: "Google Drive / Docs", color: "#0F9D58" };
  }
  if (lower.includes("github.com")) {
    return { icon: "logo-github" as const, label: "GitHub Repository", color: "#24292E" };
  }
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return { icon: "logo-youtube" as const, label: "Video Bài giảng", color: "#FF0000" };
  }
  if (lower.includes(".pdf")) {
    return { icon: "document-text" as const, label: "Tài liệu PDF", color: "#EA4335" };
  }
  return { icon: "globe-outline" as const, label: "Trang Web / Tài liệu", color: palette.primary };
}

export default function MaterialsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { token, user } = useAuth();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const className = Array.isArray(name) ? name[0] : name;

  const isTeacher = user?.role === "teacher";

  // Modal thêm tài liệu
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<"free" | "paid">("free");
  const [priceText, setPriceText] = useState("0");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [checkout, setCheckout] = useState<SePayCheckout | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [sepayWebVisible, setSepayWebVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const keyboardLift = useKeyboardLift();

  // Set tiêu đề header
  useEffect(() => {
    navigation.setOptions({
      title: className ? `Tài liệu · ${className}` : "Tài liệu học tập",
    });
  }, [navigation, className]);

  // Query danh sách tài liệu
  const query = useQuery({
    queryKey: queryKeys.materials(classId ?? ""),
    enabled: Boolean(token && classId),
    queryFn: ({ signal }) => listMaterials(token!, classId!, signal),
  });
  const { refetch } = query;
  const [pulling, setPulling] = useState(false);
  useFocusEffect(useCallback(() => {
    if (token && classId) void refetch({ cancelRefetch: false });
  }, [token, classId, refetch]));
  const onRefresh = async () => {
    setPulling(true);
    try {
      await refetch({ cancelRefetch: false });
    } finally {
      setPulling(false);
    }
  };

  // Mutation thêm tài liệu
  const createMutation = useMutation({
    mutationFn: (data: { title: string; url: string; description?: string; priceVnd?: number }) =>
      createMaterial(token!, classId!, data),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
      closeModal();
    },
    onError: (err: unknown) => {
      notifyError();
      setTitleError(null);
      setUrlError(null);
      setFormError(userErrorMessage(err));
    },
  });

  // Mutation sửa tài liệu
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; title: string; url: string; description: string; priceVnd: number }) =>
      updateMaterial(token!, classId!, data.id, {
        title: data.title,
        url: data.url,
        description: data.description,
        priceVnd: data.priceVnd,
      }),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
      closeModal();
    },
    onError: (err: unknown) => {
      notifyError();
      setTitleError(null);
      setUrlError(null);
      setFormError(userErrorMessage(err));
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (materialId: string) => createMaterialCheckout(token!, classId!, materialId),
    onSuccess: (data) => {
      setCheckout(data);
      setPayError(null);
      setPayOpen(true);
    },
    onError: (err: unknown) => {
      notifyError();
      Alert.alert("Không tạo được thanh toán", userErrorMessage(err));
    },
  });

  const confirmPayMutation = useMutation({
    mutationFn: async () => {
      if (!checkout) throw new Error("Thiếu checkout");
      // Demo shortcut only when Core has no SEPAY_* (checkout.demo === true).
      if (checkout.demo) {
        await confirmDemoPayment(token!, checkout.transactionRef);
        return { mode: "demo" as const };
      }
      const url = checkout.checkoutUrl;
      if (!url) throw new Error("Thiếu URL cổng SePay");
      // LIVE: in-app WebView only (never Chrome / expo-web-browser).
      // Đóng Dialog trước để tránh Dialog + Modal chồng lớp trên Android.
      setPayOpen(false);
      setSepayWebVisible(true);
      return { mode: "live" as const };
    },
    onSuccess: async (result) => {
      if (result?.mode === "demo") {
        notifySuccess();
        setPayOpen(false);
        setCheckout(null);
        await queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
      }
      // LIVE: WebView stays open; materials refresh after return URL intercept.
    },
    onError: (err: unknown) => {
      notifyError();
      setPayError(userErrorMessage(err));
    },
  });

  const onSePayWebClose = useCallback(
    async (result: SePayReturnResult) => {
      setSepayWebVisible(false);
      setPayOpen(false);
      setCheckout(null);
      setPayError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
      if (result === "success") {
        notifySuccess();
      } else if (result === "error") {
        notifyError();
        Alert.alert("Thanh toán chưa hoàn tất", "Giao dịch thất bại. Bạn có thể thử lại.");
      } else if (result === "cancel") {
        // User closed WebView or SePay cancel — soft refresh only.
      }
    },
    [classId]
  );

  // Mutation xóa tài liệu
  const deleteMutation = useMutation({
    mutationFn: (materialId: string) => deleteMaterial(token!, classId!, materialId),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
    },
    onError: (err: Error) => {
      notifyError();
      Alert.alert("Lỗi", userErrorMessage(err));
    },
  });

  const openEdit = (item: LmsMaterial) => {
    impactLight();
    setEditingId(item.id);
    setTitle(item.title);
    setUrl(item.url);
    setDescription(item.description ?? "");
    const price = item.priceVnd ?? 0;
    setTier(price > 0 ? "paid" : "free");
    setPriceText(price > 0 ? String(price) : "0");
    setTitleError(null);
    setUrlError(null);
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setModalVisible(false);
    setTitle("");
    setUrl("");
    setDescription("");
    setTier("free");
    setPriceText("0");
    setTitleError(null);
    setUrlError(null);
    setFormError(null);
  };

  const handleOpenLink = async (targetUrl: string) => {
    if (!isSafeHttpUrl(targetUrl)) {
      Alert.alert("Liên kết không hợp lệ", "Chỉ mở được liên kết http hoặc https.");
      return;
    }
    impactLight();
    try {
      await WebBrowser.openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch {
      await Linking.openURL(targetUrl);
    }
  };

  const handleShareLink = async (targetUrl: string, itemTitle: string) => {
    if (!isSafeHttpUrl(targetUrl)) {
      Alert.alert("Liên kết không hợp lệ", "Chỉ chia sẻ được liên kết http hoặc https.");
      return;
    }
    impactLight();
    try {
      await Share.share({
        title: itemTitle,
        message: `${itemTitle}: ${targetUrl}`,
        url: targetUrl,
      });
    } catch {
      // Ignored
    }
  };

  const handleDeleteConfirm = (item: LmsMaterial) => {
    impactLight();
    Alert.alert(
      "Xác nhận xóa tài liệu",
      `Bạn có chắc chắn muốn xóa tài liệu "${item.title}" khỏi lớp học không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]
    );
  };

  const handleCreateSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedTitle) {
      setTitleError("Vui lòng nhập tiêu đề tài liệu");
      setUrlError(null);
      setFormError(null);
      notifyError();
      return;
    }

    if (!trimmedUrl) {
      setTitleError(null);
      setUrlError("Nhập link http(s) hoặc upload file tài liệu.");
      setFormError(null);
      notifyError();
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      setTitleError(null);
      setUrlError("Đường dẫn phải bắt đầu bằng http:// hoặc https://");
      setFormError(null);
      notifyError();
      return;
    }

    setTitleError(null);
    setUrlError(null);
    setFormError(null);
    // Phí chỉ thu khi vào lớp — tài liệu trong lớp luôn miễn phí.
    const priceVnd = 0;
    void tier;
    void priceText;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        title: trimmedTitle,
        url: trimmedUrl,
        description: description.trim(),
        priceVnd,
      });
      return;
    }
    createMutation.mutate({
      title: trimmedTitle,
      url: trimmedUrl,
      description: description.trim() || undefined,
      priceVnd,
    });
  };

  const openOrUnlock = (item: LmsMaterial) => {
    void handleOpenLink(item.url);
  };

  const materials = query.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {query.isPending ? (
        <Screen>
          <ClassListSkeleton />
        </Screen>
      ) : query.isError ? (
        <Screen>
          <ErrorState message={userErrorMessage(query.error)} onRetry={() => void refetch({ cancelRefetch: false })} />
        </Screen>
      ) : materials.length === 0 ? (
        <Screen
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => void onRefresh()}
            />
          }
        >
          <EmptyState
            icon="document-text-outline"
            title="Chưa có tài liệu nào"
            subtitle={
              isTeacher
                ? "Chia sẻ liên kết tài liệu, slide bài giảng hoặc bài tập tham khảo cho học sinh trong lớp."
                : "Giáo viên phụ trách chưa đăng tải liên kết tài liệu nào cho lớp học này."
            }
            actionLabel={isTeacher ? "Thêm tài liệu ngay" : "Quay lại lớp"}
            onAction={isTeacher ? () => setModalVisible(true) : () => router.back()}
          />
        </Screen>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollList,
            { paddingTop: spacing.md + insets.top, paddingBottom: 128 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => void onRefresh()}
            />
          }
        >
          {/* Header count info */}
          <View style={styles.headerInfo}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Ionicons name="folder-open-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {materials.length} tài liệu học tập
              </Text>
            </View>
          </View>

          {/* Danh sách Material Cards */}
          <View style={styles.cardList}>
            {materials.map((item, index) => {
              const meta = getUrlMeta(item.url || "https://example.com");
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(index * 60).springify()}
                  style={[
                    styles.materialCard,
                    elevation.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => openOrUnlock(item)}
                    style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={[styles.iconCircle, { backgroundColor: `${meta.color}15` }]}>
                        <Ionicons name={meta.icon} size={20} color={meta.color} />
                      </View>
                      <View style={styles.typeLabelBox}>
                        <Text style={[styles.typeLabel, { color: meta.color }]} numberOfLines={1}>
                          {meta.label}
                        </Text>
                      </View>
                      {isTeacher && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Sửa tài liệu ${item.title}`}
                          onPress={() => openEdit(item)}
                          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                          hitSlop={8}
                        >
                          <Ionicons name="create-outline" size={17} color={theme.colors.primary} />
                        </Pressable>
                      )}
                      {isTeacher && (
                        <Pressable
                          onPress={() => handleDeleteConfirm(item)}
                          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={17} color={palette.danger} />
                        </Pressable>
                      )}
                    </View>

                    <Text style={[typography.subtitle, styles.itemTitle, { color: theme.colors.onSurface }]}>
                      {item.title}
                    </Text>

                    {Boolean(item.description) && (
                      <Text
                        numberOfLines={3}
                        style={[typography.caption, styles.itemDesc, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {item.description}
                      </Text>
                    )}

                    <View style={styles.linkRow}>
                      <Ionicons name="link-outline" size={13} color={theme.colors.primary} />
                      <Text numberOfLines={1} style={[styles.linkUrlText, { color: theme.colors.primary }]}>
                        {item.url}
                      </Text>
                    </View>
                  </Pressable>

                  <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => openOrUnlock(item)}
                    >
                      <Ionicons name="open-outline" size={15} color={theme.colors.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Mở liên kết</Text>
                    </Pressable>
                    <View style={styles.footerDivider} />
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => handleShareLink(item.url, item.title)}
                    >
                      <Ionicons name="share-social-outline" size={15} color={theme.colors.onSurfaceVariant} />
                      <Text style={[styles.actionBtnText, { color: theme.colors.onSurfaceVariant }]}>Chia sẻ</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {isTeacher && query.isSuccess && materials.length > 0 ? (
        <FAB
          icon="plus"
          label="Thêm tài liệu"
          style={[styles.fab, { bottom: spacing.lg + insets.bottom, backgroundColor: theme.colors.primary }]}
          color="#FFFFFF"
          onPress={() => {
            impactLight();
            setModalVisible(true);
          }}
        />
      ) : null}

      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={closeModal}
          style={[styles.dialog, { marginBottom: keyboardLift, backgroundColor: theme.colors.surface }]}
        >
          <KeyboardAvoidingView behavior={keyboardBehavior}>
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="file-link-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[typography.title, styles.dialogTitle]}>{editingId ? "Sửa tài liệu" : "Thêm tài liệu mới"}</Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Chia sẻ liên kết slide bài giảng hoặc tài liệu tham khảo cho lớp
              </Text>
            </View>
            {formError ? (
              <View style={styles.noticeInset}>
                <FormNotice message={formError} />
              </View>
            ) : null}
            <FormDialogScroll>
              <TextInput
                mode="outlined"
                label="Tiêu đề tài liệu *"
                placeholder="VD: Slide Bài 1 - Kiến trúc LMS"
                value={title}
                error={Boolean(titleError)}
                onChangeText={(value) => {
                  setTitle(value);
                  setTitleError(null);
                  setFormError(null);
                }}
                outlineStyle={styles.dialogInputOutline}
                style={styles.dialogInput}
                left={<TextInput.Icon icon="format-title" />}
              />
              <FieldError message={titleError} />
              <TextInput
                mode="outlined"
                label="Link tài liệu (http/https) *"
                placeholder="https://docs.google.com/..."
                autoCapitalize="none"
                keyboardType="url"
                value={url}
                error={Boolean(urlError)}
                onChangeText={(value) => {
                  setUrl(value);
                  setUrlError(null);
                  setFormError(null);
                }}
                outlineStyle={styles.dialogInputOutline}
                style={styles.dialogInput}
                left={<TextInput.Icon icon="link-variant" />}
              />
              <CloudinaryFilePicker
                label="Hoặc upload file tài liệu *"
                value={url}
                onChange={(next) => {
                  setUrl(next);
                  setUrlError(null);
                  setFormError(null);
                }}
                token={token}
                classId={classId}
                purpose="material"
              />
              <FieldError message={urlError} />
              <TextInput
                mode="outlined"
                label="Mô tả / Hướng dẫn (tuỳ chọn)"
                placeholder="Ghi chú thêm cho học sinh..."
                multiline
                numberOfLines={2}
                value={description}
                onChangeText={setDescription}
                outlineStyle={styles.dialogInputOutline}
                style={styles.dialogInput}
                left={<TextInput.Icon icon="text" />}
              />
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Thành viên lớp xem được toàn bộ tài liệu. Phí chỉ thu khi học sinh vào lớp.
              </Text>
            </FormDialogScroll>
            <Dialog.Actions style={styles.dialogActions}>
              <AppButton
                mode="text"
                onPress={closeModal}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Hủy
              </AppButton>
              <AppButton
                mode="contained"
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={createMutation.isPending || updateMutation.isPending}
                onPress={handleCreateSubmit}
              >
                {editingId ? "Lưu thay đổi" : "Đăng tài liệu"}
              </AppButton>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>

        <Dialog
          visible={payOpen}
          onDismiss={() => {
            setPayOpen(false);
            setCheckout(null);
            setPayError(null);
          }}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title>Mở khóa tài nguyên · SePay</Dialog.Title>
          <Dialog.Content>
            {payError ? <FormNotice message={payError} /> : null}
            <Text style={[typography.body, { marginBottom: spacing.sm }]}>
              {checkout
                ? `Thanh toán ${formatVnd(checkout.amount)} để mở “${checkout.materialTitle}”.`
                : "Đang chuẩn bị checkout…"}
            </Text>
            {checkout?.bankInfo ? (
              <View
                testID="payment-bank-info"
                style={{
                  marginBottom: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: theme.colors.surfaceVariant,
                  gap: 4,
                }}
              >
                <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                  Ngân hàng {checkout.bankInfo.bankCode} · chuyển khoản
                </Text>
                <Text style={[typography.body, { fontWeight: "700" }]}>
                  STK: {checkout.bankInfo.accountNumber}
                </Text>
                <Text style={typography.body}>{checkout.bankInfo.accountName}</Text>
                <Text style={[typography.body, { fontWeight: "700" }]}>
                  Số tiền: {formatVnd(checkout.bankInfo.amount || checkout.amount)}
                </Text>
              </View>
            ) : null}
            {checkout ? (
              <Text
                testID={checkout.demo ? "payment-mode-demo" : "payment-mode-live"}
                style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}
              >
                Mã đơn: {checkout.transactionRef}
                {"\n"}
                {checkout.demo
                  ? "Chế độ demo (chưa cấu hình SEPAY): bấm xác nhận sau khi chuyển khoản giả lập."
                  : "LIVE SePay: quét QR trong ứng dụng (không mở Chrome)."}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton
              mode="text"
              testID="payment-dialog-close"
              onPress={() => {
                setPayOpen(false);
                setCheckout(null);
              }}
              disabled={confirmPayMutation.isPending}
            >
              Đóng
            </AppButton>
            <AppButton
              testID={checkout?.demo ? "payment-confirm-demo" : "payment-open-sepay"}
              loading={confirmPayMutation.isPending || checkoutMutation.isPending}
              disabled={!checkout}
              onPress={() => confirmPayMutation.mutate()}
            >
              {checkout?.demo ? "Tôi đã chuyển khoản" : "Quét QR trong ứng dụng"}
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <SePayCheckoutWebView
        visible={sepayWebVisible && Boolean(checkout?.checkoutUrl) && !checkout?.demo}
        checkoutUrl={checkout?.checkoutUrl ?? ""}
        title={checkout ? `SePay · ${formatVnd(checkout.amount)}` : "SePay"}
        onClose={(result) => {
          void onSePayWebClose(result);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardList: {
    gap: spacing.md,
  },
  materialCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardMain: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  typeLabelBox: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  tierSwitch: { marginBottom: spacing.sm },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tierText: { fontSize: 11, fontWeight: "800" },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  linkUrlText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  footerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: palette.line,
  },
  pressed: {
    opacity: 0.7,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    borderRadius: radius.pill,
  },
  dialog: {
    maxHeight: "88%",
    borderRadius: 20,
    paddingVertical: spacing.xs,
  },
  dialogHeader: {
    alignItems: "center",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 4,
  },
  dialogIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  dialogInput: {
    backgroundColor: "transparent",
  },
  dialogInputOutline: {
    borderRadius: 12,
  },
  dialogActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  noticeInset: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
