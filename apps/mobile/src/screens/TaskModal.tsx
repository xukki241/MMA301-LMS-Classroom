import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/src/components/ui/AppButton";
import {
  FieldError,
  FormDialogScroll,
  FormNotice,
  useKeyboardLift,
} from "@/src/components/ui/FormFeedback";
import { impactLight, notifyError } from "@/src/lib/haptics";
import type { CreateTaskPayload, LmsTask, TaskPriority } from "@/src/lib/tasks-api";
import { palette, radius, spacing, typography } from "@/src/theme/tokens";

type TaskModalProps = {
  visible: boolean;
  onDismiss: () => void;
  initialTask?: LmsTask | null;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  isPending: boolean;
};

const PRIORITY_OPTIONS: {
  key: TaskPriority;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  activeBorder: string;
}[] = [
  {
    key: "low",
    label: "Thấp",
    icon: "flag-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
    activeBorder: "#6366F1",
  },
  {
    key: "medium",
    label: "Trung bình",
    icon: "flag",
    color: "#D97706",
    bg: "#FEF3C7",
    activeBorder: "#F59E0B",
  },
  {
    key: "high",
    label: "Cao",
    icon: "flame",
    color: "#DC2626",
    bg: "#FEE2E2",
    activeBorder: "#EF4444",
  },
];

const PRESETS = [
  { key: "none", label: "Không" },
  { key: "today", label: "Hôm nay" },
  { key: "tomorrow", label: "Ngày mai" },
  { key: "3days", label: "3 ngày tới" },
  { key: "custom", label: "Ngày khác" },
];

export function TaskModal({
  visible,
  onDismiss,
  initialTask,
  onSubmit,
  isPending,
}: TaskModalProps) {
  const theme = useTheme();
  const keyboardLift = useKeyboardLift();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDatePreset, setDueDatePreset] = useState<string>("none");
  const [customDueDate, setCustomDueDate] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialTask) {
        setTitle(initialTask.title);
        setDescription(initialTask.description || "");
        setPriority(initialTask.priority);
        if (initialTask.dueDate) {
          setDueDatePreset("custom");
          setCustomDueDate(new Date(initialTask.dueDate).toISOString().slice(0, 10));
        } else {
          setDueDatePreset("none");
          setCustomDueDate("");
        }
      } else {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setDueDatePreset("none");
        setCustomDueDate("");
      }
      setErrorMsg(null);
    }
  }, [visible, initialTask]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      setErrorMsg("Tiêu đề công việc phải có ít nhất 2 ký tự");
      notifyError();
      return;
    }

    let dueDate: string | undefined;
    if (dueDatePreset === "today") {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      dueDate = today.toISOString();
    } else if (dueDatePreset === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      dueDate = tomorrow.toISOString();
    } else if (dueDatePreset === "3days") {
      const in3Days = new Date();
      in3Days.setDate(in3Days.getDate() + 3);
      in3Days.setHours(23, 59, 59, 999);
      dueDate = in3Days.toISOString();
    } else if (dueDatePreset === "custom" && customDueDate) {
      const parsed = new Date(customDueDate);
      if (!Number.isNaN(parsed.getTime())) {
        dueDate = parsed.toISOString();
      }
    }

    try {
      impactLight();
      await onSubmit({
        title: trimmedTitle,
        description: description.trim(),
        priority,
        dueDate,
      });
      onDismiss();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu công việc";
      setErrorMsg(msg);
      notifyError();
    }
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[
          styles.dialog,
          {
            backgroundColor: theme.colors.surface,
            transform: [{ translateY: keyboardLift }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Ionicons
              name={initialTask ? "create-outline" : "checkbox-outline"}
              size={22}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={typography.title}>
              {initialTask ? "Chỉnh sửa công việc" : "Thêm công việc mới"}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              {initialTask
                ? "Cập nhật tiến độ và hạn chót"
                : "Lên kế hoạch và theo dõi công việc cá nhân"}
            </Text>
          </View>
        </View>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <FormDialogScroll>
            <View style={styles.form}>
              {errorMsg ? <FormNotice message={errorMsg} /> : null}

              <View>
                <TextInput
                  label="Tiêu đề công việc *"
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  mode="outlined"
                  placeholder="Ví dụ: Hoàn thành bài tập Lab 3"
                  autoFocus
                  disabled={isPending}
                />
                {title.length > 0 && title.trim().length < 2 ? (
                  <FieldError message="Tiêu đề phải có tối thiểu 2 ký tự" />
                ) : null}
              </View>

              <TextInput
                label="Ghi chú chi tiết (tùy chọn)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Ghi chú thêm thông tin hoặc liên kết cần nhớ…"
                disabled={isPending}
              />

              {/* Priority Picker */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Mức độ ưu tiên</Text>
                <View style={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map((opt) => {
                    const isSelected = priority === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => {
                          impactLight();
                          setPriority(opt.key);
                        }}
                        style={[
                          styles.priorityCard,
                          {
                            borderColor: isSelected ? opt.activeBorder : theme.colors.outline,
                            backgroundColor: isSelected ? opt.bg : theme.colors.surface,
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={18}
                          color={isSelected ? opt.color : theme.colors.onSurfaceVariant}
                        />
                        <Text
                          style={[
                            styles.priorityText,
                            {
                              color: isSelected ? opt.color : theme.colors.onSurfaceVariant,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Due Date Presets */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Hạn hoàn thành</Text>
                <View style={styles.presetChips}>
                  {PRESETS.map((preset) => {
                    const isSelected = dueDatePreset === preset.key;
                    return (
                      <Pressable
                        key={preset.key}
                        onPress={() => {
                          impactLight();
                          setDueDatePreset(preset.key);
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surfaceVariant,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.outline,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? theme.colors.onPrimary
                                : theme.colors.onSurfaceVariant,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {dueDatePreset === "custom" && (
                  <TextInput
                    label="Hạn hoàn thành (YYYY-MM-DD)"
                    value={customDueDate}
                    onChangeText={setCustomDueDate}
                    mode="outlined"
                    placeholder="2026-10-20"
                    style={{ marginTop: spacing.xs }}
                    disabled={isPending}
                  />
                )}
              </View>
            </View>
          </FormDialogScroll>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.actions}>
          <AppButton mode="text" onPress={onDismiss} disabled={isPending}>
            Hủy
          </AppButton>
          <AppButton
            mode="contained"
            onPress={() => void handleSave()}
            loading={isPending}
            disabled={isPending || title.trim().length < 2}
          >
            {initialTask ? "Cập nhật" : "Tạo công việc"}
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: radius.xl,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    color: palette.inkMuted,
    marginBottom: spacing.xs,
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  priorityCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  priorityText: {
    fontSize: 12,
  },
  presetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
});
