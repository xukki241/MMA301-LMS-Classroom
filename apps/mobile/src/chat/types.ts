export type ChatParticipantRole = "teacher" | "student";

export type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  avatarLabel: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  authorName: string;
  text: string;
  createdAt: string;
  mine: boolean;
};
