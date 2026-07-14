import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send, Sparkles, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "raksha-chat-v1";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/safety-chat`;

const SUGGESTIONS = [
  "Nenu okate ratri lo travel chestunna, tips cheppu",
  "Someone is following me — what do I do?",
  "First aid for a deep cut",
  "How to file an FIR for harassment?",
];

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamText]);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
  }, [streaming]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || streaming) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamText("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Chat failed" }));
        toast.error(err.error || "Chat failed. Try again.");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              full += delta;
              setStreamText(full);
            }
          } catch {
            /* ignore */
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full || "…" }]);
      setStreamText("");
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Network error");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat cleared");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-trust text-secondary-foreground sticky top-0 z-10">
        <div className="container py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-background/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-background/20 backdrop-blur flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold leading-tight">Raksha AI</div>
            <div className="text-[11px] opacity-80">Your safety assistant</div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-background/20" aria-label="Clear chat">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container py-4 space-y-3">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-trust flex items-center justify-center shadow-trust">
                <Shield className="w-8 h-8 text-secondary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Hi, I'm Raksha AI 👋</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Safety tips, first aid, emergency steps, helpline info — anytime, any language.
                </p>
              </div>
              <div className="grid gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left p-3 rounded-2xl bg-card border border-border text-sm hover:border-primary/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}

          {streaming && (
            <MessageBubble role="assistant" content={streamText || "…"} typing={!streamText} />
          )}
        </div>
      </div>

      <div className="sticky bottom-16 bg-background/95 backdrop-blur border-t border-border">
        <div className="container py-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about safety, first aid, emergency…"
              rows={1}
              className="flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl"
              disabled={streaming}
            />
            <Button
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              size="icon"
              className="h-11 w-11 rounded-2xl bg-gradient-emergency"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            In an emergency, tap SOS or call 100 immediately.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

const MessageBubble = ({
  role,
  content,
  typing,
}: {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}) => {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground text-sm whitespace-pre-wrap shadow-card"
            : "max-w-[90%] text-sm text-foreground"
        }
      >
        {isUser ? (
          content
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2">
            {typing ? (
              <span className="inline-flex gap-1 items-center text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              <ReactMarkdown>{content}</ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
