import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Divider, Text } from "react-native-paper";
import { AppButton } from "../ui/AppButton";
import { StreamComposer } from "./StreamComposer";
import { StreamRequestError } from "./StreamRequestError";
import { COMMENT_MAX_LENGTH } from "../../lib/stream-api";
import { commentsOptions, createCommentOptions, type StreamSession } from "../../lib/stream-query";
import { streamAccessDenied } from "../../lib/stream-errors";
import { spacing, typography } from "../../theme/tokens";

export function CommentThread({ session, postId }: { session: StreamSession; postId: string }) {
  const client = useQueryClient();
  const query = useQuery(commentsOptions(session, postId));
  const mutation = useMutation(createCommentOptions(client, session, postId));
  const denied = streamAccessDenied(query.error) || streamAccessDenied(mutation.error);
  const refresh = async () => {
    const result = await query.refetch();
    if (result.isSuccess && streamAccessDenied(mutation.error)) mutation.reset();
  };
  return (
    <View style={styles.thread}>
      <Divider />
      <Text style={typography.subtitle} accessibilityRole="header">Bình luận</Text>
      {query.isPending ? <ActivityIndicator accessibilityLabel="Đang tải bình luận" /> : null}
      <StreamRequestError error={query.error} onRetry={() => void refresh()} />
      {!denied && query.data ? <>
        {query.data.length === 0 && !query.isError ? <Text>Chưa có bình luận nào.</Text> : null}
        {query.data.map(comment => (
          <View key={comment.id} style={styles.comment}>
            <Text style={typography.caption}>Tác giả: {comment.authorId}</Text>
            <Text style={typography.caption}>{new Date(comment.createdAt).toLocaleString("vi-VN")}</Text>
            <Text style={typography.body} selectable>{comment.content}</Text>
            <Divider />
          </View>
        ))}
        <StreamComposer kind="comment" maxLength={COMMENT_MAX_LENGTH}
          pending={mutation.isPending} error={mutation.error} onSubmit={mutation.mutateAsync} />
      </> : <StreamRequestError error={mutation.error} />}
      <AppButton mode="text" loading={query.isFetching} onPress={() => void refresh()}>Làm mới bình luận</AppButton>
    </View>
  );
}
const styles = StyleSheet.create({
  thread: { gap: spacing.md, marginTop: spacing.sm },
  comment: { gap: spacing.sm },
});
