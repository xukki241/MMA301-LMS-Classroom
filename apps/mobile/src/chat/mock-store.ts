/**
 * Mock chat layer — tách biệt backend.
 * Khi Core API có conversation/message, thay file này bằng API client thật.
 */
import type { ChatMessage, Conversation } from "./types";

const seedConversations: Conversation[] = [
  {
    id: "c1",
    title: "Toán 12A1",
    subtitle: "GV Nguyễn Lan",
    avatarLabel: "T",
    lastMessage: "Nhớ nộp bài chương 3 trước thứ Sáu nhé.",
    lastAt: "09:12",
    unread: 2,
  },
  {
    id: "c2",
    title: "Lý 11B",
    subtitle: "Nhóm lớp",
    avatarLabel: "L",
    lastMessage: "Tài liệu thí nghiệm đã đăng trên bảng tin.",
    lastAt: "Hôm qua",
    unread: 0,
  },
  {
    id: "c3",
    title: "Hỗ trợ LMS",
    subtitle: "Classroom Bot",
    avatarLabel: "C",
    lastMessage: "Bạn có thể hỏi mã lớp hoặc hạn nộp bài.",
    lastAt: "T2",
    unread: 0,
  },
];

const seedMessages: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: "m1",
      conversationId: "c1",
      authorName: "GV Nguyễn Lan",
      text: "Chào lớp, hôm nay ta ôn đạo hàm.",
      createdAt: "08:40",
      mine: false,
    },
    {
      id: "m2",
      conversationId: "c1",
      authorName: "Bạn",
      text: "Thầy ơi em chưa hiểu phần vi phân.",
      createdAt: "08:52",
      mine: true,
    },
    {
      id: "m3",
      conversationId: "c1",
      authorName: "GV Nguyễn Lan",
      text: "Nhớ nộp bài chương 3 trước thứ Sáu nhé.",
      createdAt: "09:12",
      mine: false,
    },
  ],
  c2: [
    {
      id: "m4",
      conversationId: "c2",
      authorName: "Minh",
      text: "Tài liệu thí nghiệm đã đăng trên bảng tin.",
      createdAt: "Hôm qua",
      mine: false,
    },
  ],
  c3: [
    {
      id: "m5",
      conversationId: "c3",
      authorName: "Classroom Bot",
      text: "Đây là foundation UI chat. API thật chưa có — dữ liệu đang ở mock layer.",
      createdAt: "T2",
      mine: false,
    },
  ],
};

let conversations = seedConversations.map((item) => ({ ...item }));
const messages: Record<string, ChatMessage[]> = Object.fromEntries(
  Object.entries(seedMessages).map(([key, value]) => [key, value.map((item) => ({ ...item }))])
);

export const CHAT_MOCK_NOTICE = "Chat đang dùng mock layer — chưa nối API";

export function listMockConversations(): Conversation[] {
  return conversations.map((item) => ({ ...item }));
}

export function getMockConversation(id: string): Conversation | undefined {
  return conversations.find((item) => item.id === id);
}

export function listMockMessages(conversationId: string): ChatMessage[] {
  return (messages[conversationId] ?? []).map((item) => ({ ...item }));
}

export function sendMockMessage(conversationId: string, text: string): ChatMessage {
  const message: ChatMessage = {
    id: `local-${Date.now()}`,
    conversationId,
    authorName: "Bạn",
    text,
    createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    mine: true,
  };
  messages[conversationId] = [...(messages[conversationId] ?? []), message];
  conversations = conversations.map((item) =>
    item.id === conversationId
      ? { ...item, lastMessage: text, lastAt: "Vừa xong", unread: 0 }
      : item
  );
  return message;
}
