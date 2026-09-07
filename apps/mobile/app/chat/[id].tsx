import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Banner, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageBubble } from "@/src/components/chat/MessageBubble";
import { ChatComposer } from "@/src/components/chat/ChatComposer";
import {
  CHAT_MOCK_NOTICE,
  getMockConversation,
  listMockMessages,
  sendMockMessage,
} from "@/src/chat/mock-store";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { spacing } from "@/src/theme/tokens";

export default function ChatThreadScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const conversation = conversationId ? getMockConversation(conversationId) : undefined;
  const [messages, setMessages] = useState(() =>
    conversationId ? listMockMessages(conversationId) : []
  );

  useEffect(() => {
    navigation.setOptions({ title: conversation?.title ?? "Tin nhắn" });
  }, [conversation?.title, navigation]);

  if (!conversationId || !conversation) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <EmptyState title="Không tìm thấy hội thoại" subtitle="Quay lại danh sách chat." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Banner visible icon="information-outline">
          {CHAT_MOCK_NOTICE}
        </Banner>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => <MessageBubble item={item} index={index} />}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có tin nhắn</Text>}
        />
        <View>
          <ChatComposer
            onSend={(text) => {
              sendMockMessage(conversationId, text);
              setMessages(listMockMessages(conversationId));
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: spacing.xxl },
});
