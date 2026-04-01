import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ChatMessage } from "../api/types";

interface Props {
  message: ChatMessage;
}

export const ChatBubble = memo(function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool) {
    return (
      <View style={styles.toolRow}>
        <View style={styles.toolDot} />
        <Text style={styles.toolText} numberOfLines={2}>
          {message.content}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          message.isStreaming && styles.bubbleStreaming,
        ]}
      >
        <Text
          style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
          selectable
        >
          {message.content}
        </Text>
        {message.isStreaming && (
          <Text style={styles.streamingDot}>...</Text>
        )}
        {message.cost != null && message.cost > 0 && (
          <Text style={styles.cost}>${message.cost.toFixed(4)}</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    marginHorizontal: 12,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: "#6C5CE7",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#1E1E2E",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#2D2D44",
  },
  bubbleStreaming: {
    borderColor: "#6C5CE7",
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: "#FFFFFF",
  },
  textAssistant: {
    color: "#E0E0F0",
  },
  streamingDot: {
    color: "#6C5CE7",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 2,
  },
  cost: {
    color: "#666680",
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },
  // Tool call styles
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    marginHorizontal: 16,
    gap: 8,
  },
  toolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F39C12",
  },
  toolText: {
    color: "#8888AA",
    fontSize: 12,
    fontFamily: "monospace",
    flex: 1,
  },
});
