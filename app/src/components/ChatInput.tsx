import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";

interface Props {
  onSend: (text: string) => void;
  onInterrupt: () => void;
  isThinking: boolean;
  disabled: boolean;
}

const SHORTCUTS = [
  { label: "Ctrl+C", action: "interrupt" },
  { label: "/compact", action: "/compact" },
  { label: "/clear", action: "/clear" },
  { label: "/cost", action: "/cost" },
  { label: "/help", action: "/help" },
];

export function ChatInput({ onSend, onInterrupt, isThinking, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleShortcut = (action: string) => {
    if (action === "interrupt") {
      onInterrupt();
    } else {
      onSend(action);
    }
  };

  return (
    <View style={styles.container}>
      {/* Shortcut buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.shortcuts}
        contentContainerStyle={styles.shortcutsContent}
      >
        {SHORTCUTS.map((s) => (
          <TouchableOpacity
            key={s.label}
            style={[
              styles.shortcutBtn,
              s.action === "interrupt" && isThinking && styles.shortcutBtnActive,
            ]}
            onPress={() => handleShortcut(s.action)}
          >
            <Text
              style={[
                styles.shortcutText,
                s.action === "interrupt" && isThinking && styles.shortcutTextActive,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? "Connecting..." : "Message Tanu..."}
          placeholderTextColor="#555570"
          multiline
          maxLength={10000}
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Text style={styles.sendIcon}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: "#2D2D44",
    backgroundColor: "#12121C",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  shortcuts: {
    marginBottom: 8,
  },
  shortcutsContent: {
    gap: 8,
    paddingRight: 4,
  },
  shortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#1E1E2E",
    borderWidth: 1,
    borderColor: "#2D2D44",
  },
  shortcutBtnActive: {
    backgroundColor: "#E74C3C",
    borderColor: "#E74C3C",
  },
  shortcutText: {
    color: "#8888AA",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  shortcutTextActive: {
    color: "#FFF",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1E1E2E",
    color: "#E0E0F0",
    fontSize: 15,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#2D2D44",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6C5CE7",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#2D2D44",
  },
  sendIcon: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
