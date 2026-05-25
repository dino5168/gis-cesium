import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { chatStream, type ChatMessage } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AiChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
    streamingIdRef.current = assistantMsg.id;

    // snapshot current history before state update
    const history: ChatMessage[] = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      for await (const chunk of chatStream(history, ctrl.signal)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: m.content + chunk.message.content }
              : m,
          ),
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
        // remove the empty assistant bubble on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
      }
    } finally {
      setStreaming(false);
      streamingIdRef.current = null;
      abortRef.current = null;
    }
  }, [input, streaming, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-2xl space-y-4 py-6">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {t("chat.empty")}
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                {msg.content}
                {/* blinking cursor while this message is streaming */}
                {msg.id === streamingIdRef.current && streaming && (
                  <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-text-bottom" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <p className="shrink-0 px-4 pb-1 text-center text-xs text-destructive">{error}</p>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            className="max-h-36 min-h-[44px] resize-none"
            placeholder={t("chat.placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
          />
          <Button
            size="icon"
            className="mb-0.5 shrink-0"
            onClick={() => void send()}
            disabled={!input.trim() || streaming}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
