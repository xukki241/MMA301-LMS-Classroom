import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ClassListSkeleton } from "@/src/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/src/components/ui/EmptyState";
import { AppButton } from "@/src/components/ui/AppButton";
import { useAuth } from "@/src/lib/auth-context";
import {
  createMaterial,
  deleteMaterial,
  listMaterials,
  type LmsMaterial,
} from "@/src/lib/materials-api";
import { queryClient, queryKeys } from "@/src/lib/query-client";
import { impactLight, notifyError, notifySuccess } from "@/src/lib/haptics";
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
  const { token, user } = useAuth();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const classId = Array.isArray(id) ? id[0] : id;
  const className = Array.isArray(name) ? name[0] : name;

  const isTeacher = user?.role === "teacher";

  // Modal thêm tài liệu
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  // Mutation thêm tài liệu
  const createMutation = useMutation({
    mutationFn: (data: { title: string; url: string; description?: string }) =>
      createMaterial(token!, classId!, data),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
      closeModal();
    },
    onError: (err: Error) => {
      notifyError();
      setFormError(err.message || "Không thể thêm tài liệu lúc này");
    },
  });

  // Mutation xóa tài liệu
  const deleteMutation = useMutation({
    mutationFn: (materialId: string) => deleteMaterial(token!, classId!, materialId),
    onSuccess: () => {
      notifySuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials(classId!) });
    },
    onError: (err: Error) => {
      notifyError();
      Alert.alert("Lỗi", err.message || "Không thể xóa tài liệu");
    },
  });

  const closeModal = () => {
    setModalVisible(false);
    setTitle("");
    setUrl("");
    setDescription("");
    setFormError(null);
  };

  const handleOpenLink = async (targetUrl: string) => {
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
      setFormError("Vui lòng nhập tiêu đề tài liệu");
      notifyError();
      return;
    }

    if (!trimmedUrl) {
      setFormError("Vui lòng nhập đường dẫn URL tài liệu");
      notifyError();
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      setFormError("Đường dẫn phải bắt đầu bằng http:// hoặc https://");
      notifyError();
      return;
    }

    setFormError(null);
    createMutation.mutate({
      title: trimmedTitle,
      url: trimmedUrl,
      description: description.trim() || undefined,
    });
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
          <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
        </Screen>
      ) : materials.length === 0 ? (
        <Screen
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
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
            actionLabel={isTeacher ? "Thêm tài liệu ngay" : undefined}
            onAction={isTeacher ? () => setModalVisible(true) : undefined}
          />
        </Screen>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
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
              const meta = getUrlMeta(item.url);
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
                    onPress={() => handleOpenLink(item.url)}
                    style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
                  >
                    {/* Top Row: Icon type + Label */}
                    <View style={styles.cardTopRow}>
                      <View style={[styles.iconCircle, { backgroundColor: `${meta.color}15` }]}>
                        <Ionicons name={meta.icon} size={20} color={meta.color} />
                      </View>
                      <View style={styles.typeLabelBox}>
                        <Text style={[styles.typeLabel, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>

                      {/* Nút Xóa (Dành cho Giáo viên) */}
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

                    {/* Tiêu đề tài liệu */}
                    <Text style={[typography.subtitle, styles.itemTitle, { color: theme.colors.onSurface }]}>
                      {item.title}
                    </Text>

                    {/* Mô tả chi tiết nếu có */}
                    {Boolean(item.description) && (
                      <Text
                        numberOfLines={3}
                        style={[typography.caption, styles.itemDesc, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {item.description}
                      </Text>
                    )}

                    {/* URL text link */}
                    <View style={styles.linkRow}>
                      <Ionicons name="link-outline" size={13} color={theme.colors.primary} />
                      <Text
                        numberOfLines={1}
                        style={[styles.linkUrlText, { color: theme.colors.primary }]}
                      >
                        {item.url}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Bottom Action Bar */}
                  <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => handleOpenLink(item.url)}
                    >
                      <Ionicons name="open-outline" size={15} color={theme.colors.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>
                        Mở liên kết
                      </Text>
                    </Pressable>

                    <View style={styles.footerDivider} />

                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => handleShareLink(item.url, item.title)}
                    >
                      <Ionicons name="share-social-outline" size={15} color={theme.colors.onSurfaceVariant} />
                      <Text style={[styles.actionBtnText, { color: theme.colors.onSurfaceVariant }]}>
                        Chia sẻ
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* FAB Nổi thêm tài liệu (Chỉ dành cho Giáo viên) */}
      {isTeacher && (
        <FAB
          icon="plus"
          label="Thêm tài liệu"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color="#FFFFFF"
          onPress={() => {
            impactLight();
            setModalVisible(true);
          }}
        />
      )}

      {/* Dialog Form Thêm Tài Liệu */}
      <Portal>
        <Dialog
          visible={modalVisible}
          onDismiss={closeModal}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="file-link-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[typography.title, styles.dialogTitle]}>Thêm tài liệu mới</Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Chia sẻ liên kết slide bài giảng hoặc tài liệu tham khảo cho lớp
              </Text>
            </View>

            <Dialog.Content style={styles.dialogContent}>
              {Boolean(formError) && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={palette.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <TextInput
                mode="outlined"
                label="Tiêu đề tài liệu *"
                placeholder="VD: Slide Bài 1 - Kiến trúc LMS"
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (formError) setFormError(null);
                }}
                outlineStyle={styles.dialogInputOutline}
                style={styles.dialogInput}
                left={<TextInput.Icon icon="format-title" />}
              />

              <TextInput
                mode="outlined"
                label="Đường dẫn liên kết (URL) *"
                placeholder="https://docs.google.com/..."
                autoCapitalize="none"
                keyboardType="url"
                value={url}
                onChangeText={(t) => {
                  setUrl(t);
                  if (formError) setFormError(null);
                }}
                outlineStyle={styles.dialogInputOutline}
                style={styles.dialogInput}
                left={<TextInput.Icon icon="link-variant" />}
              />

              <TextInput
                mode="outlined"
                label="Mô tả / Hướng dẫn (tuỳ chọn)"
                placeholder="Ghi chú thêm cho học sinh..."
                multiline
                numberOfLines={2}
                value={description}
                onChangeText={(t) => setDescription(t)}
                outlineStyle={styles.dialogInputOutline}
                style={styles.dialogInput}
                left={<TextInput.Icon icon="text" />}
              />
            </Dialog.Content>

            <Dialog.Actions style={styles.dialogActions}>
              <AppButton
                mode="text"
                onPress={closeModal}
                disabled={createMutation.isPending}
              >
                Hủy
              </AppButton>
              <AppButton
                mode="contained"
                loading={createMutation.isPending}
                disabled={createMutation.isPending}
                onPress={handleCreateSubmit}
              >
                Đăng tài liệu
              </AppButton>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
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
    paddingBottom: 90,
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
  deleteBtn: {
    padding: 6,
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
    gap: 6,
    paddingVertical: 4,
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
    bottom: spacing.xl,
    borderRadius: radius.pill,
  },
  dialog: {
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
  dialogContent: {
    gap: spacing.sm,
    paddingTop: spacing.md,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.dangerSoft,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginBottom: 4,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: palette.danger,
    fontWeight: "500",
  },
});
