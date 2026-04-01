import React, { useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { StatusBar } from "../components/StatusBar";
import { PermissionModal } from "../components/PermissionModal";
import { useTanu } from "../hooks/useTanu";
import type { ConnectionConfig, ChatMessage } from "../api/types";

interface Props {
  config: ConnectionConfig;
  onDisconnect: () => void;
}

export function ChatScreen({ config, onDisconnect }: Props) {
  const insets = useSafeAreaInsets();
  const {
    messages,
    connected,
    status,
    pendingPermission,
    sendMessage,
    respondToPermission,
    interrupt,
    clearMessages,
  } = useTanu(config);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Auto-scroll to bottom on new messages or content changes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages.length, messages[messages.length - 1]?.content.length]);

  const isThinking = status === "thinking";

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Tanu</Text>
          <StatusBar status={status} connected={connected} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={clearMessages} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDisconnect} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, styles.disconnectText]}>
              Disconnect
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              hey babe, what are we building today?
            </Text>
            <Text style={styles.emptySubtext}>
              {config.cwd}
            </Text>
          </View>
        }
      />

      {/* Permission Modal */}
      <PermissionModal
        permission={pendingPermission}
        onRespond={respondToPermission}
      />

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput
          onSend={sendMessage}
          onInterrupt={interrupt}
          isThinking={isThinking}
          disabled={!connected}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E2E",
    backgroundColor: "#0A0A14",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    color: "#6C5CE7",
    fontSize: 20,
    fontWeight: "800",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1E1E2E",
  },
  headerBtnText: {
    color: "#8888AA",
    fontSize: 13,
    fontWeight: "600",
  },
  disconnectText: {
    color: "#E74C3C",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#8888AA",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#555570",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "monospace",
  },
});
