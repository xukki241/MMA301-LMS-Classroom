import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { listPosts, listComments, createPost, createComment, type StreamPost, type StreamComment } from "./stream-api";

export type StreamSession = { userId: string; token: string; classId: string };

export function postsOptions(session: StreamSession) {
  return queryOptions({
    queryKey: ["stream", session.userId, session.classId, "posts"] as const,
    queryFn: ({ signal }) => listPosts(session.token, session.classId, signal),
    retry: false, // http already handles GET retries.
  });
}
export function commentsOptions(session: StreamSession, postId: string) {
  return queryOptions({
    queryKey: ["stream", session.userId, session.classId, postId, "comments"] as const,
    queryFn: ({ signal }) => listComments(session.token, session.classId, postId, signal),
    retry: false,
  });
}
export function createPostOptions(client: QueryClient, session: StreamSession) {
  const { queryKey } = postsOptions(session);
  return {
    mutationFn: (content: string) => createPost(session.token, session.classId, content),
    retry: false as const,
    onSuccess: async (post: StreamPost) => {
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData<StreamPost[]>(queryKey, old => [post, ...(old ?? []).filter(item => item.id !== post.id)]);
      await client.invalidateQueries({ queryKey, exact: true });
    },
  };
}
export function createCommentOptions(client: QueryClient, session: StreamSession, postId: string) {
  const { queryKey } = commentsOptions(session, postId);
  return {
    mutationFn: (content: string) => createComment(session.token, session.classId, postId, content),
    retry: false as const,
    onSuccess: async (comment: StreamComment) => {
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData<StreamComment[]>(queryKey, old => [...(old ?? []).filter(item => item.id !== comment.id), comment]);
      await client.invalidateQueries({ queryKey, exact: true });
    },
  };
}
