const API_BASE = "http://localhost:8000";

// ── Textbook ───────────────────────────────────────────

export interface ChapterMeta {
  id: number;
  title: string;
  slug: string;
  description: string;
}

export interface PlanRequest {
  topic: string;
  grade?: string;
  language?: string;
  num_chapters?: number;
  pages_per_chapter?: number;
}

export interface PlanResponse {
  book_slug: string;
  plan: { chapters: ChapterMeta[] };
}

export interface GenerateRequest {
  book_slug: string;
  plan: { chapters: ChapterMeta[] };
  pages_per_chapter: number;
  grade: string;
  language: string;
}

export type TextbookEvent =
  | { event: "chapter_done"; chapter_slug: string; chapter_title: string; files: string[] }
  | { event: "done"; book_slug: string; files_written: string[] }
  | { event: "error"; message: string };

export async function planTextbook(req: PlanRequest): Promise<PlanResponse> {
  const r = await fetch(`${API_BASE}/textbook/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error(`Plan failed (${r.status}): ${r.statusText}`);
  return r.json() as Promise<PlanResponse>;
}

export async function* generateTextbook(req: GenerateRequest): AsyncGenerator<TextbookEvent> {
  const response = await fetch(`${API_BASE}/textbook/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) throw new Error(`Generate failed (${response.status}): ${response.statusText}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          yield JSON.parse(line.slice(6)) as TextbookEvent;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface ToolInfo {
  name: string;
  description: string;
}

export interface ToolCallRecord {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export interface ToolChatResponse {
  content: string;
  tool_calls: ToolCallRecord[];
}

export async function fetchTools(): Promise<ToolInfo[]> {
  const r = await fetch(`${API_BASE}/tools`);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<ToolInfo[]>;
}

export async function toolChat(
  messages: ChatMessage[],
  tools: string[],
  signal?: AbortSignal,
): Promise<ToolChatResponse> {
  const r = await fetch(`${API_BASE}/tools/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, tools }),
    signal,
  });
  if (!r.ok) throw new Error(`Backend error ${r.status}: ${r.statusText}`);
  return r.json() as Promise<ToolChatResponse>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatChunk {
  message: { role: string; content: string };
  model: string;
  done: boolean;
}

export async function* chatStream(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Backend error ${response.status}: ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          yield JSON.parse(line.slice(6)) as ChatChunk;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
