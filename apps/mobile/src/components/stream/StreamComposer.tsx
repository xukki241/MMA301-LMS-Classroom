import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { HelperText, TextInput } from "react-native-paper";
import { AppButton } from "../ui/AppButton";
import { StreamRequestError } from "./StreamRequestError";
import { spacing } from "../../theme/tokens";

type Props = {
  kind: "post" | "comment";
  maxLength: number;
  pending: boolean;
  error: unknown;
  onSubmit: (content: string) => Promise<unknown>;
};
export function StreamComposer({ kind, maxLength, pending, error, onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const isPost = kind === "post";
  const length = content.trim().length;
  const valid = length > 0 && length <= maxLength;
  const submit = async () => {
    if (lock.current || pending || !valid) return;
    lock.current = true;
    setBusy(true);
    setSubmitted(false);
    try {
      await onSubmit(content.trim());
      setContent("");
      setSubmitted(true);
    } catch {
      // The mutation's typed error is rendered below; retain the draft.
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={styles.form}>
      <TextInput mode="outlined" label={isPost ? "Nội dung bài đăng" : "Nội dung bình luận"}
        accessibilityLabel={isPost ? "Nội dung bài đăng" : "Nội dung bình luận"}
        multiline textAlignVertical="top" style={{ minHeight: isPost ? 120 : 88 }}
        value={content} onChangeText={value => { setContent(value); setSubmitted(false); }}
        editable={!pending && !busy} error={length > maxLength} />
      <HelperText type={length > maxLength ? "error" : "info"} visible>
        {length}/{maxLength} ký tự
      </HelperText>
      <StreamRequestError error={error} />
      {submitted ? <HelperText type="info" visible accessibilityLiveRegion="polite">
        {isPost ? "Đã đăng bài." : "Đã gửi bình luận."}
      </HelperText> : null}
      <AppButton loading={pending || busy} disabled={!valid}
        onPress={() => void submit()}>{isPost ? "Đăng bài" : "Gửi bình luận"}</AppButton>
    </View>
  );
}
const styles = StyleSheet.create({ form: { gap: spacing.xs, marginVertical: spacing.md } });
