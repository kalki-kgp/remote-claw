import { spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import type {
  Session,
  CLIOutputMessage,
  CLIInputUserMessage,
  CLIInputControlResponse,
  MobileOutbound,
} from "./types.js";

export class SessionManager extends EventEmitter {
  private sessions = new Map<string, Session>();
  private buffers = new Map<string, string>(); // partial line buffers per session
  private streamingUUIDs = new Map<string, string>(); // track current streaming message per session
  private streamingTexts = new Map<string, string>(); // accumulated text per streaming message

  createSession(cwd: string): { sessionId: string } {
    const sessionId = randomUUID();

    const args = [
      "-p",
      "--output-format", "stream-json",
      "--input-format", "stream-json",
      "--include-partial-messages",
      "--replay-user-messages",
      "--verbose",
    ];

    console.log(`[session:${sessionId.slice(0, 8)}] spawning: claude ${args.join(" ")}`);
    console.log(`[session:${sessionId.slice(0, 8)}] cwd: ${cwd}`);

    const proc = spawn("claude", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    const session: Session = {
      id: sessionId,
      process: proc,
      cwd,
      createdAt: new Date(),
      lastActivity: new Date(),
      alive: true,
    };

    this.sessions.set(sessionId, session);
    this.buffers.set(sessionId, "");

    proc.stdout!.on("data", (chunk: Buffer) => {
      this.handleStdout(sessionId, chunk.toString());
    });

    proc.stderr!.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        console.log(`[session:${sessionId.slice(0, 8)}] stderr: ${text}`);
      }
    });

    proc.on("exit", (code, signal) => {
      console.log(`[session:${sessionId.slice(0, 8)}] exited code=${code} signal=${signal}`);
      session.alive = false;
      this.emit(`status:${sessionId}`, {
        type: "status",
        status: "disconnected",
        message: `Claude process exited (code ${code})`,
      } satisfies MobileOutbound);
      this.cleanup(sessionId);
    });

    proc.on("error", (err) => {
      console.error(`[session:${sessionId.slice(0, 8)}] process error:`, err.message);
      session.alive = false;
      this.emit(`status:${sessionId}`, {
        type: "status",
        status: "error",
        message: err.message,
      } satisfies MobileOutbound);
    });

    return { sessionId };
  }

  sendMessage(sessionId: string, content: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.alive) return false;

    const msg: CLIInputUserMessage = {
      type: "user",
      message: { role: "user", content },
    };

    session.lastActivity = new Date();
    return this.writeToStdin(session, msg);
  }

  sendPermissionResponse(sessionId: string, requestId: string, behavior: "allow" | "deny"): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.alive) return false;

    const msg: CLIInputControlResponse = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        result: { behavior },
      },
    };

    session.lastActivity = new Date();
    return this.writeToStdin(session, msg);
  }

  sendInterrupt(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.alive) return false;

    const msg = {
      type: "control_request",
      request_id: randomUUID(),
      request: { subtype: "interrupt" },
    };

    return this.writeToStdin(session, msg);
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): Array<{ id: string; cwd: string; alive: boolean; createdAt: Date }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      cwd: s.cwd,
      alive: s.alive,
      createdAt: s.createdAt,
    }));
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.alive) {
      session.process.kill("SIGTERM");
    }
    this.cleanup(sessionId);
  }

  private writeToStdin(session: Session, msg: object): boolean {
    try {
      const line = JSON.stringify(msg) + "\n";
      return session.process.stdin!.write(line);
    } catch (err) {
      console.error(`[session:${session.id.slice(0, 8)}] stdin write error:`, err);
      return false;
    }
  }

  private handleStdout(sessionId: string, chunk: string): void {
    const buffer = (this.buffers.get(sessionId) || "") + chunk;
    const lines = buffer.split("\n");

    // last element is either empty (line ended with \n) or a partial line
    this.buffers.set(sessionId, lines.pop() || "");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg: CLIOutputMessage = JSON.parse(trimmed);
        this.processMessage(sessionId, msg);
      } catch {
        console.log(`[session:${sessionId.slice(0, 8)}] non-json stdout: ${trimmed}`);
      }
    }
  }

  private processMessage(sessionId: string, msg: CLIOutputMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) session.lastActivity = new Date();

    switch (msg.type) {
      case "stream_event": {
        if (msg.event?.type === "content_block_delta" && msg.event.delta?.text) {
          const currentUUID = this.streamingUUIDs.get(sessionId);
          if (currentUUID !== msg.uuid) {
            this.streamingUUIDs.set(sessionId, msg.uuid);
            this.streamingTexts.set(sessionId, "");
          }

          const accumulated = (this.streamingTexts.get(sessionId) || "") + msg.event.delta.text;
          this.streamingTexts.set(sessionId, accumulated);

          this.emit(`message:${sessionId}`, {
            type: "stream_delta",
            text: msg.event.delta.text,
            uuid: msg.uuid,
          } satisfies MobileOutbound);
        }

        // Emit thinking status when streaming starts
        this.emit(`status:${sessionId}`, {
          type: "status",
          status: "thinking",
        } satisfies MobileOutbound);
        break;
      }

      case "assistant": {
        // Emit tool_use blocks first
        for (const block of msg.message.content) {
          if (block.type === "tool_use") {
            this.emit(`message:${sessionId}`, {
              type: "tool_use",
              tool_name: block.name,
              tool_input: block.input,
            } satisfies MobileOutbound);
          }
        }

        // Then emit text
        const textBlocks = msg.message.content.filter(
          (b): b is { type: "text"; text: string } => b.type === "text"
        );
        const fullText = textBlocks.map((b) => b.text).join("\n");

        // Clear streaming state
        this.streamingUUIDs.delete(sessionId);
        this.streamingTexts.delete(sessionId);

        if (fullText) {
          this.emit(`message:${sessionId}`, {
            type: "assistant_text",
            text: fullText,
            uuid: msg.uuid,
            is_partial: false,
          } satisfies MobileOutbound);
        }
        break;
      }

      case "result": {
        this.emit(`message:${sessionId}`, {
          type: "result",
          subtype: msg.subtype,
          result: msg.result,
          is_error: msg.is_error,
          cost_usd: msg.total_cost_usd,
          duration_ms: msg.duration_ms,
        } satisfies MobileOutbound);

        this.emit(`status:${sessionId}`, {
          type: "status",
          status: "idle",
        } satisfies MobileOutbound);
        break;
      }

      case "control_request": {
        if (msg.request.subtype === "can_use_tool") {
          this.emit(`message:${sessionId}`, {
            type: "permission_request",
            request_id: msg.request_id,
            tool_name: msg.request.tool_name || "unknown",
            tool_input: msg.request.tool_input || {},
            description: msg.request.description || `Use tool: ${msg.request.tool_name}`,
          } satisfies MobileOutbound);
        }
        break;
      }

      case "tool_progress": {
        this.emit(`message:${sessionId}`, {
          type: "tool_progress",
          content: JSON.stringify(msg),
        } satisfies MobileOutbound);
        break;
      }

      case "user": {
        // Replayed user message, ignore
        break;
      }

      case "system": {
        console.log(`[session:${sessionId.slice(0, 8)}] system:`, JSON.stringify(msg));
        break;
      }

      case "keep_alive": {
        break;
      }

      default: {
        // Forward unknown message types as-is for debugging
        console.log(`[session:${sessionId.slice(0, 8)}] unknown msg type:`, (msg as any).type);
        break;
      }
    }
  }

  private cleanup(sessionId: string): void {
    this.buffers.delete(sessionId);
    this.streamingUUIDs.delete(sessionId);
    this.streamingTexts.delete(sessionId);
  }
}
