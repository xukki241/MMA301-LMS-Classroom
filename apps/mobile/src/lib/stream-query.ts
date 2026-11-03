import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { listComments, createPost, createComment, deletePost, updatePost, type StreamPost, type StreamComment } from "./stream-api";
import { cachedPosts } from "./offline-data";

export type StreamSession = { userId: string; token: string; classId: string };

export function postsOptions(session: StreamSession) {
  return queryOptions({
    queryKey: ["stream", session.userId, session.classId, "posts"] as const,
    queryFn: ({ signal }) => cachedPosts(session.token, session.userId, session.classId, signal),
    networkMode: "always",
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
    networkMode: "always" as const,
    mutationFn: (input: string | { content: string; attachmentUrl?: string }) => {
      const content = typeof input === "string" ? input : input.content;
      const attachmentUrl = typeof input === "string" ? "" : input.attachmentUrl ?? "";
      return createPost(session.token, session.classId, content, attachmentUrl);
    },
    retry: false as const,
    onSuccess: async (post: StreamPost) => {
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData<StreamPost[]>(queryKey, old => [post, ...(old ?? []).filter(item => item.id !== post.id)]);
      await client.invalidateQueries({ queryKey, exact: true });
    },
  };
}
export function updatePostOptions(client: QueryClient, session: StreamSession) {
  const { queryKey } = postsOptions(session);
  return {
    networkMode: "always" as const,
    mutationFn: (input: { postId: string; content: string; attachmentUrl?: string }) =>
      updatePost(session.token, session.classId, input.postId, input.content, input.attachmentUrl ?? ""),
    retry: false as const,
    onSuccess: async (post: StreamPost) => {
      client.setQueryData<StreamPost[]>(queryKey, old => (old ?? []).map(item => item.id === post.id ? post : item));
      await client.invalidateQueries({ queryKey, exact: true });
    },
  };
}
export function deletePostOptions(client: QueryClient, session: StreamSession) {
  const { queryKey } = postsOptions(session);
  return {
    networkMode: "always" as const,
    mutationFn: (postId: string) => deletePost(session.token, session.classId, postId),
    retry: false as const,
    onSuccess: async (_result: void, postId: string) => {
      client.setQueryData<StreamPost[]>(queryKey, old => (old ?? []).filter(item => item.id !== postId));
      await client.invalidateQueries({ queryKey, exact: true });
    },
  };
}
export function createCommentOptions(client: QueryClient, session: StreamSession, postId: string) {
  const { queryKey } = commentsOptions(session, postId);
  return {
    networkMode: "always" as const,
    mutationFn: (content: string) => createComment(session.token, session.classId, postId, content),
    retry: false as const,
    onSuccess: async (comment: StreamComment) => {
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData<StreamComment[]>(queryKey, old => [...(old ?? []).filter(item => item.id !== comment.id), comment]);
      await client.invalidateQueries({ queryKey, exact: true });
    },
  };
}
