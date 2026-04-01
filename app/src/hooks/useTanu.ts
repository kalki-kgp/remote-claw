import { useState, useEffect, useCallback, useRef } from "react";
import { TanuBridgeClient } from "../api/client";
import type {
  ChatMessage,
  PendingPermission,
  BridgeMessage,
  ConnectionConfig,
} from "../api/types";

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`;
}

function formatToolUse(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "Read":
      return `Reading ${input.file_path || "file"}`;
    case "Write":
      return `Writing ${input.file_path || "file"}`;
    case "Edit":
      return `Editing ${input.file_path || "file"}`;
    case "Bash":
      return `$ ${typeof input.command === "string" ? input.command.slice(0, 120) : "..."}`;
    case "Glob":
      return `Finding files: ${input.pattern || "..."}`;
    case "Grep":
      return `Searching: ${input.pattern || "..."}`;
    case "WebSearch":
      return `Searching web: ${input.query || "..."}`;
    case "WebFetch":
      return `Fetching: ${input.url || "..."}`;
    case "TodoWrite":
      return `Updating tasks`;
    case "Agent":
      return `Spawning agent: ${input.description || "..."}`;
    default:
      return `${name}`;
  }
}

export function useTanu(config: ConnectionConfig | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>("disconnected");
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const clientRef = useRef<TanuBridgeClient | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!config) return;

    const client = new TanuBridgeClient(config);
    clientRef.current = client;

    const unsubMsg = client.onMessage((msg: BridgeMessage) => {
      switch (msg.type) {
        case "stream_delta": {
          if (!msg.text) break;
          if (!streamingIdRef.current) {
            // Start a new streaming bubble
            const id = nextId();
            streamingIdRef.current = id;
            setMessages((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                content: msg.text,
                timestamp: new Date(),
                isStreaming: true,
              },
            ]);
          } else {
            // Append to existing streaming bubble
            const streamId = streamingIdRef.current;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === streamId);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                content: updated[idx].content + msg.text,
              };
              return updated;
            });
          }
          break;
        }

        case "assistant_text": {
          // Final assembled message — replace the streaming bubble
          const streamId = streamingIdRef.current;
          streamingIdRef.current = null;

          if (streamId) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === streamId);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                content: msg.text,
                isStreaming: false,
              };
              return updated;
            });
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                content: msg.text,
                timestamp: new Date(),
                isStreaming: false,
              },
            ]);
          }
          break;
        }

        case "tool_use": {
          // Format a nice summary of the tool call
          const summary = formatToolUse(msg.tool_name, msg.tool_input);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "tool",
              content: summary,
              timestamp: new Date(),
              toolName: msg.tool_name,
              toolInput: msg.tool_input,
            },
          ]);
          break;
        }

        case "permission_request": {
          setPendingPermission({
            request_id: msg.request_id,
            tool_name: msg.tool_name,
            tool_input: msg.tool_input,
            description: msg.description,
          });
          break;
        }

        case "result": {
          streamingIdRef.current = null;
          setStatus("idle");
          if (msg.cost_usd > 0) {
            setMessages((prev) => {
              // Attach cost to last assistant message
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].role === "assistant") {
                  const updated = [...prev];
                  updated[i] = { ...updated[i], cost: msg.cost_usd };
                  return updated;
                }
              }
              return prev;
            });
          }
          break;
        }

        case "status": {
          setStatus(msg.status);
          if (msg.status === "thinking" && !streamingIdRef.current) {
            // Reset for new turn
          }
          break;
        }
      }
    });

    const unsubStatus = client.onStatus((isConnected) => {
      setConnected(isConnected);
      if (!isConnected) setStatus("disconnected");
    });

    client.connect().catch((err) => {
      console.error("Failed to connect:", err);
      setStatus("error");
    });

    return () => {
      unsubMsg();
      unsubStatus();
      client.disconnect();
      clientRef.current = null;
    };
  }, [config]);

  const sendMessage = useCallback((content: string) => {
    if (!clientRef.current) return;

    // Reset streaming state for new turn
    streamingIdRef.current = null;

    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "user",
        content,
        timestamp: new Date(),
      },
    ]);

    clientRef.current.sendMessage(content);
    setStatus("thinking");
  }, []);

  const respondToPermission = useCallback(
    (behavior: "allow" | "deny") => {
      if (!clientRef.current || !pendingPermission) return;
      clientRef.current.sendPermissionResponse(pendingPermission.request_id, behavior);
      setPendingPermission(null);
    },
    [pendingPermission]
  );

  const interrupt = useCallback(() => {
    clientRef.current?.sendInterrupt();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingIdRef.current = null;
  }, []);

  return {
    messages,
    connected,
    status,
    pendingPermission,
    sendMessage,
    respondToPermission,
    interrupt,
    clearMessages,
  };
}
