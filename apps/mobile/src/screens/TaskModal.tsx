import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Dialog,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { AppButton } from "@/src/components/ui/AppButton";
import {
  FieldError,
  FormDialogScroll,
  FormNotice,
  keyboardBehavior,
  useKeyboardLift,
} from "@/src/components/ui/FormFeedback";
import { impactLight, notifyError } from "@/src/lib/haptics";
import type { CreateTaskPayload, LmsTask, TaskPriority } from "@/src/lib/tasks-api";
import { radius, spacing, typography } from "@/src/theme/tokens";

type TaskModalProps = {
  visible: boolean;
  onDismiss: () => void;
  initialTask?: LmsTask | null;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  isPending: boolean;
};

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
        style={[styles.dialog, { transform: [{ translateY: keyboardLift }] }]}
      >
        <Dialog.Title style={typography.title}>
          {initialTask ? "Sửa công việc" : "Thêm công việc mới"}
        </Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <FormDialogScroll>
            <View style={styles.form}>
              {errorMsg ? <FormNotice message={errorMsg} /> : null}

              <View>
                <TextInput
                  label="Tiêu đề *"
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  mode="outlined"
                  placeholder="Ví dụ: Ôn tập chương 3 React Native"
                  autoFocus
                  disabled={isPending}
                />
                {title.length > 0 && title.trim().length < 2 ? (
                  <FieldError message="Tiêu đề phải có tối thiểu 2 ký tự" />
                ) : null}
              </View>

              <TextInput
                label="Mô tả ghi chú"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Thêm chi tiết nếu cần…"
                disabled={isPending}
              />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mức độ ưu tiên</Text>
                <SegmentedButtons
                  value={priority}
                  onValueChange={(val) => setPriority(val as TaskPriority)}
                  buttons={[
                    { value: "low", label: "Thấp" },
                    { value: "medium", label: "Trung bình" },
                    { value: "high", label: "Cao" },
                  ]}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thời hạn hoàn thành</Text>
                <SegmentedButtons
                  value={dueDatePreset}
                  onValueChange={setDueDatePreset}
                  buttons={[
                    { value: "none", label: "Không" },
                    { value: "today", label: "Hôm nay" },
                    { value: "tomorrow", label: "Ngày mai" },
                    { value: "3days", label: "3 ngày" },
                  ]}
                />
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
            Lưu
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: radius.lg,
    maxHeight: "85%",
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
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
