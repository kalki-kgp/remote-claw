export interface Session {
  id: string;
  process: import("child_process").ChildProcess;
  cwd: string;
  createdAt: Date;
  lastActivity: Date;
  alive: boolean;
}

// Messages FROM Claude CLI (stdout)
export type CLIOutputMessage =
  | CLIUserMessage
  | CLIAssistantMessage
  | CLIResultMessage
  | CLIStreamEvent
  | CLIControlRequest
  | CLISystemMessage
  | CLIToolProgress
  | CLIKeepAlive;

export interface CLIUserMessage {
  type: "user";
  message: { role: "user"; content: string | ContentBlock[] };
  parent_tool_use_id: string | null;
  uuid: string;
  session_id: string;
}

export interface CLIAssistantMessage {
  type: "assistant";
  message: { content: ContentBlock[] };
  parent_tool_use_id: string | null;
  uuid: string;
  session_id: string;
}

export interface CLIResultMessage {
  type: "result";
  subtype: "success" | "error_during_execution" | "error_max_turns" | "error_max_budget_usd";
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  result: string;
  stop_reason: string | null;
  total_cost_usd: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    costUSD: number;
  };
  uuid: string;
  session_id: string;
}

export interface CLIStreamEvent {
  type: "stream_event";
  event: {
    type: string;
    index?: number;
    delta?: { type: string; text?: string };
    [key: string]: unknown;
  };
  parent_tool_use_id: string | null;
  uuid: string;
  session_id: string;
}

export interface CLIControlRequest {
  type: "control_request";
  request_id: string;
  request: {
    subtype: string;
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    description?: string;
    [key: string]: unknown;
  };
}

export interface CLISystemMessage {
  type: "system";
  subtype?: string;
  [key: string]: unknown;
}

export interface CLIToolProgress {
  type: "tool_progress";
  [key: string]: unknown;
}

export interface CLIKeepAlive {
  type: "keep_alive";
}

// Messages TO Claude CLI (stdin)
export interface CLIInputUserMessage {
  type: "user";
  message: { role: "user"; content: string | ContentBlock[] };
  parent_tool_use_id?: string | null;
}

export interface CLIInputControlResponse {
  type: "control_response";
  response: {
    subtype: "success" | "error";
    request_id: string;
    result?: { behavior: "allow" | "deny"; message?: string };
    [key: string]: unknown;
  };
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | ContentBlock[] };

// WebSocket messages from mobile app
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

export type MobileInbound = MobileUserMessage | MobilePermissionResponse | MobileInterrupt;

// WebSocket messages TO mobile app
export interface MobileChatMessage {
  type: "assistant_text";
  text: string;
  uuid: string;
  is_partial: boolean;
}

export interface MobileStreamDelta {
  type: "stream_delta";
  text: string;
  uuid: string;
}

export interface MobilePermissionRequest {
  type: "permission_request";
  request_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  description: string;
}

export interface MobileSessionResult {
  type: "result";
  subtype: string;
  result: string;
  is_error: boolean;
  cost_usd: number;
  duration_ms: number;
}

export interface MobileToolUse {
  type: "tool_use";
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface MobileToolProgress {
  type: "tool_progress";
  content: string;
  tool_name?: string;
}

export interface MobileStatus {
  type: "status";
  status: "connected" | "disconnected" | "thinking" | "idle" | "error";
  message?: string;
}

export type MobileOutbound =
  | MobileChatMessage
  | MobileStreamDelta
  | MobilePermissionRequest
  | MobileSessionResult
  | MobileToolUse
  | MobileToolProgress
  | MobileStatus;
