const API_BASE = "http://localhost:8000";

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
