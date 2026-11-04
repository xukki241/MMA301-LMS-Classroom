import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useFocusEffect } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Alert, KeyboardAvoidingView, Linking, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text } from "react-native-paper";
import { Screen } from "../components/ui/Screen";
import { AppButton } from "../components/ui/AppButton";
import { EmptyState } from "../components/ui/EmptyState";
import { StreamComposer } from "../components/stream/StreamComposer";
import { StreamRequestError } from "../components/stream/StreamRequestError";
import { CommentThread } from "../components/stream/CommentThread";
import { useAuth } from "../lib/auth-context";
import { HttpError } from "../lib/http";
import { cachedClassDetail } from "../lib/offline-data";
import { queryKeys } from "../lib/query-client";
import { POST_MAX_LENGTH, type StreamPost } from "../lib/stream-api";
import { postsOptions, createPostOptions, deletePostOptions, updatePostOptions, type StreamSession } from "../lib/stream-query";
import { streamAccessDenied } from "../lib/stream-errors";
import { spacing, typography } from "../theme/tokens";

export default function ClassStreamScreen({ classId }: { classId: string }) {
  const { loading, token, user } = useAuth();
  const detail = useQuery({
    queryKey: queryKeys.class(user?.id ?? "", classId),
    enabled: Boolean(token && user && classId),
    queryFn: ({ signal }) => cachedClassDetail(token!, user!.id, user!.role, classId, signal),
    networkMode: "always",
    staleTime: 0,
  });
  const { refetch } = detail;
  useFocusEffect(useCallback(() => {
    if (token && user && classId) void refetch();
  }, [token, user, classId, refetch]));
  if (loading) return <Screen><ActivityIndicator accessibilityLabel="Đang tải phiên đăng nhập" /></Screen>;
  if (!token || !user) return <Redirect href="/(auth)/login" />;
  if (!classId) return <Screen><StreamRequestError error={new HttpError("Invalid class", 400)} /></Screen>;
  if (detail.isPending || detail.isFetching) return <Screen><ActivityIndicator accessibilityLabel="Đang kiểm tra quyền trong lớp" /></Screen>;
  if (detail.isError) return <Screen><StreamRequestError error={detail.error} onRetry={() => void detail.refetch()} /></Screen>;
  return <StreamFeed key={user.id + ":" + classId} session={{ userId: user.id, token, classId }} role={detail.data.roleInClass} />;
}
function StreamFeed({ session, role }: { session: StreamSession; role: "teacher" | "student" }) {
  const headerHeight = useHeaderHeight();
  const client = useQueryClient();
  const query = useQuery(postsOptions(session));
  const mutation = useMutation(createPostOptions(client, session));
  const updateMutation = useMutation(updatePostOptions(client, session));
  const deleteMutation = useMutation(deletePostOptions(client, session));
  const denied = streamAccessDenied(query.error) || streamAccessDenied(mutation.error);
  const refresh = async () => {
    const result = await query.refetch();
    if (result.isSuccess && streamAccessDenied(mutation.error)) mutation.reset();
  };
  return (
    <KeyboardAvoidingView style={styles.fill} behavior="padding"
      keyboardVerticalOffset={headerHeight}>
      <Screen keyboardInset={false} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void refresh()} />}>
        <Text style={typography.title} accessibilityRole="header">Bảng tin lớp học</Text>
        <Text style={[typography.body, styles.intro]}>Thông báo từ giáo viên và bình luận của thành viên.</Text>
        {query.isPending ? <ActivityIndicator accessibilityLabel="Đang tải bảng tin" /> : null}
        <StreamRequestError error={query.error} onRetry={() => void refresh()} />
        {denied ? <StreamRequestError error={mutation.error} /> : null}
        {!denied && query.data ? <>
          {role === "teacher" ? <Card mode="outlined" style={styles.card}><Card.Content>
            <Text style={typography.subtitle} accessibilityRole="header">Đăng thông báo</Text>
            <StreamComposer kind="post" maxLength={POST_MAX_LENGTH} pending={mutation.isPending}
              error={mutation.error} token={session.token} classId={session.classId}
              onSubmit={async (content, attachmentUrl) => { await mutation.mutateAsync({ content, attachmentUrl }); }} />
          </Card.Content></Card> : null}
          {!query.isError && query.data.length === 0 ? <EmptyState icon="newspaper-outline"
            title="Chưa có bài đăng nào."
            subtitle={role === "teacher" ? "Đăng thông báo đầu tiên cho lớp học." : "Giáo viên chưa đăng thông báo cho lớp này."} /> : null}
          {query.data.map(post => (
            <PostCard
              key={post.id}
              post={post}
              session={session}
              canManage={role === "teacher" || post.authorId === session.userId}
              onUpdate={async (content, attachmentUrl) => {
                await updateMutation.mutateAsync({ postId: post.id, content, attachmentUrl });
              }}
              onDelete={() => {
                Alert.alert("Xóa bài đăng?", "Bài này sẽ biến khỏi bảng tin.", [
                  { text: "Hủy", style: "cancel" },
                  { text: "Xóa", style: "destructive", onPress: () => deleteMutation.mutate(post.id) },
                ]);
              }}
            />
          ))}
        </> : null}
        <AppButton mode="text" loading={query.isFetching} onPress={() => void refresh()}>Làm mới bảng tin</AppButton>
      </Screen>
    </KeyboardAvoidingView>
  );
}
function PostCard({
  post,
  session,
  canManage,
  onUpdate,
  onDelete,
}: {
  post: StreamPost;
  session: StreamSession;
  canManage: boolean;
  onUpdate: (content: string, attachmentUrl?: string) => Promise<unknown>;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content style={styles.post}>
        <Text style={typography.caption}>Tác giả: {post.authorDisplayName}</Text>
        <Text style={typography.caption}>{new Date(post.createdAt).toLocaleString("vi-VN")}</Text>
        {editing ? (
          <StreamComposer
            kind="post"
            maxLength={POST_MAX_LENGTH}
            pending={false}
            error={null}
            token={session.token}
            classId={session.classId}
            initialContent={post.content}
            initialAttachmentUrl={post.attachmentUrl}
            submitLabel="Lưu sửa"
            onSubmit={async (content, attachmentUrl) => {
              await onUpdate(content, attachmentUrl);
              setEditing(false);
            }}
          />
        ) : (
          <Text style={typography.body} selectable>{post.content}</Text>
        )}
        {post.attachmentUrl ? (
          <Pressable onPress={() => void Linking.openURL(post.attachmentUrl)}>
            <Text style={[typography.caption, { color: "#0F5223" }]}>Mở tài liệu đính kèm</Text>
          </Pressable>
        ) : null}
        {canManage ? (
          <View style={styles.actions}>
            <AppButton mode="text" onPress={() => setEditing((value) => !value)}>{editing ? "Hủy sửa" : "Sửa"}</AppButton>
            <AppButton mode="text" textColor="#C5221F" onPress={onDelete}>Xóa</AppButton>
          </View>
        ) : null}
        <AppButton mode="text" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
          {expanded ? "Ẩn bình luận" : "Xem bình luận"}
        </AppButton>
        {expanded ? <CommentThread session={session} postId={post.id} /> : null}
      </Card.Content>
    </Card>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  intro: { marginVertical: spacing.md },
  card: { marginBottom: spacing.lg },
  post: { gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
});
