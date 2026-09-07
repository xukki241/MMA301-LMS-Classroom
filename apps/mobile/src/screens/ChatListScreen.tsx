import { StyleSheet, View } from "react-native";
import { Banner, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/ui/Screen";
import { ConversationRow } from "@/src/components/chat/ConversationRow";
import { CHAT_MOCK_NOTICE, listMockConversations } from "@/src/chat/mock-store";
import { spacing, typography } from "@/src/theme/tokens";

export function ChatListScreen() {
  const router = useRouter();
  const conversations = listMockConversations();

  return (
    <Screen>
      <Text style={typography.title}>Tin nhắn</Text>
      <Banner visible icon="information-outline" style={styles.banner}>
        {CHAT_MOCK_NOTICE}
      </Banner>
      <View style={styles.list}>
        {conversations.map((item, index) => (
          <ConversationRow
            key={item.id}
            item={item}
            index={index}
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { marginVertical: spacing.md, borderRadius: 12 },
  list: { paddingTop: spacing.sm },
});
