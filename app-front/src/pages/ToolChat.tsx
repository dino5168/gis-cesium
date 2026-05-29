import { useEffect, useRef, useState } from "react";
import { Wrench, ChevronDown, ChevronRight, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchTools,
  toolChat,
  type ChatMessage,
  type ToolCallRecord,
  type ToolInfo,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────

type UIMessage =
  | { id: string; type: "user"; content: string }
  | { id: string; type: "tool_steps"; calls: ToolCallRecord[] }
  | { id: string; type: "assistant"; content: string };

// ── ToolSteps card ─────────────────────────────────────

function ToolStepCard({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false);
  const hasArgs = Object.keys(call.arguments).length > 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 text-xs overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <Wrench size={12} className="shrink-0 text-muted-foreground" />
        <span className="font-mono font-semibold text-foreground">{call.name}</span>
        {hasArgs && (
          open
            ? <ChevronDown size={11} className="ml-auto shrink-0 text-muted-foreground" />
            : <ChevronRight size={11} className="ml-auto shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && hasArgs && (
        <div className="border-t border-border px-3 py-2 bg-muted/20">
          <p className="mb-1 text-muted-foreground">參數</p>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground">
            {JSON.stringify(call.arguments, null, 2)}
          </pre>
        </div>
      )}

      <div className="border-t border-border px-3 py-2">
        <p className="mb-0.5 text-muted-foreground">結果</p>
        <p className="whitespace-pre-wrap font-mono text-[11px] text-foreground">{call.result}</p>
      </div>
    </div>
  );
}

// ── ToolChat ───────────────────────────────────────────

export default function ToolChat() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load available tools
  useEffect(() => {
    fetchTools()
      .then((list) => {
        setTools(list);
        setEnabledTools(new Set(list.map((t) => t.name)));
      })
      .catch(() => {/* backend not ready */});
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const toggleTool = (name: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);

    const uid = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: uid, type: "user", content: text }]);

    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await toolChat(
        nextHistory,
        [...enabledTools],
        abortRef.current.signal,
      );

      if (res.tool_calls.length > 0) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), type: "tool_steps", calls: res.tool_calls },
        ]);
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: "assistant", content: res.content },
      ]);

      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: res.content },
      ]);
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message ?? "發生錯誤");
      setMessages((prev) => prev.filter((m) => m.id !== uid));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => { abortRef.current?.abort(); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tool toggles */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">啟用工具：</span>
        {tools.map((tool) => {
          const active = enabledTools.has(tool.name);
          return (
            <button
              key={tool.name}
              onClick={() => toggleTool(tool.name)}
              title={tool.description}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30",
              )}
            >
              <Wrench size={10} />
              {tool.name}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              選擇工具後輸入問題，模型將自動呼叫需要的工具。
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.type === "tool_steps") {
            return (
              <div key={msg.id} className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Wrench size={11} /> 工具呼叫過程
                </p>
                {msg.calls.map((call, i) => (
                  <ToolStepCard key={i} call={call} />
                ))}
              </div>
            );
          }

          // assistant
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
              思考中…
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            rows={1}
            placeholder="輸入問題… (Enter 送出，Shift+Enter 換行)"
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          {loading ? (
            <button
              onClick={stop}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-destructive text-white transition-colors hover:bg-destructive/80"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={() => void send()}
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
