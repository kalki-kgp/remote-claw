// Messages TO bridge (from mobile)
export interface MobileUserMessage {
  type: "user_message";
  content: string;
}

export interface MobilePermissionResponse {
  type: "permission_response";
  request_id: string;
  behavior: "allow" | "deny";
}

export interface MobileInterrupt {
  type: "interrupt";
}

export type MobileOutbound = MobileUserMessage | MobilePermissionResponse | MobileInterrupt;

// Messages FROM bridge (to mobile)
export interface AssistantTextMessage {
  type: "assistant_text";
  text: string;
  uuid: string;
  is_partial: boolean;
}

export interface StreamDeltaMessage {
  type: "stream_delta";
  text: string;
  uuid: string;
}

export interface PermissionRequestMessage {
  type: "permission_request";
  request_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  description: string;
}

export interface ResultMessage {
  type: "result";
  subtype: string;
  result: string;
  is_error: boolean;
  cost_usd: number;
  duration_ms: number;
}

export interface ToolUseMessage {
  type: "tool_use";
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface ToolProgressMessage {
  type: "tool_progress";
  content: string;
  tool_name?: string;
}

export interface StatusMessage {
  type: "status";
  status: "connected" | "disconnected" | "thinking" | "idle" | "error";
  message?: string;
}

export type BridgeMessage =
  | AssistantTextMessage
  | StreamDeltaMessage
  | PermissionRequestMessage
  | ResultMessage
  | ToolUseMessage
  | ToolProgressMessage
  | StatusMessage;

// Chat UI types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  cost?: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
}

export interface PendingPermission {
  request_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  description: string;
}

export interface ConnectionConfig {
  host: string;
  port: string;
  token: string;
  cwd: string;
}
