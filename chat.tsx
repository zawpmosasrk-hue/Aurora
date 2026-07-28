import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User, RefreshCw, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage, createConversation } from "@/lib/chat.functions";
import { falaTexto } from "@/lib/tts.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat de teste — Aurora IA" }] }),
  component: ChatPlayground,
});

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  intent: string | null;
  audio_url: string | null;
  created_at: string;
};

function ChatPlayground() {
  const qc = useQueryClient();
  const send = useServerFn(sendChatMessage);
  const create = useServerFn(createConversation);
  const tts = useServerFn(synthesizeMessageAudio);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [ttsBusy, setTtsBusy] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
      return data;
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    if (!conversationId) {
      // create initial conversation
      create({ data: { customerName: "Cliente teste", channel: "test" } })
        .then((c: { id: string }) => setConversationId(c.id))
        .catch((e: unknown) => toast.error(String(e)));
    }
  }, [conversationId, create]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messagesQuery.data]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      if (!conversationId) throw new Error("Sem conversa");
      return send({ data: { conversationId, message } });
    },
    onSuccess: async (res) => {
      if (res?.intent) {
        // auto TTS if enabled
        if (settings?.tts_enabled) {
          // fetch the last assistant message id
          const { data } = await supabase
            .from("messages")
            .select("id")
            .eq("conversation_id", conversationId!)
            .eq("role", "assistant")
            .order("created_at", { ascending: false })
            .limit(1);
          const id = data?.[0]?.id;
          if (id) {
            const out = await tts({ data: { messageId: id } });
            if (!out.ok) toast.error(out.error);
          }
        }
      }
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      inputRef.current?.focus();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    // optimistic user message
    qc.setQueryData<Msg[]>(["messages", conversationId], (old) => [
      ...(old ?? []),
      {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: text,
        intent: null,
        audio_url: null,
        created_at: new Date().toISOString(),
      },
    ]);
    mutation.mutate(text);
  };

  const playAudio = async (m: Msg) => {
    if (m.audio_url) {
      new Audio(m.audio_url).play();
      return;
    }
    setTtsBusy(m.id);
    const out = await tts({ data: { messageId: m.id } });
    setTtsBusy(null);
    if (!out.ok) return toast.error(out.error);
    new Audio(out.audio_url).play();
    qc.invalidateQueries({ queryKey: ["messages", conversationId] });
  };

  const newConversation = async () => {
    const c = await create({ data: { customerName: "Cliente teste", channel: "test" } });
    setConversationId(c.id);
    qc.invalidateQueries({ queryKey: ["metrics"] });
  };

  const messages = messagesQuery.data ?? [];
  const isLoading = mutation.isPending;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Chat de teste</h1>
          <p className="text-sm text-muted-foreground">Simule uma conversa como se fosse do WhatsApp/Instagram.</p>
        </div>
        <Button variant="outline" size="sm" onClick={newConversation}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Nova conversa
        </Button>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-border/60">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {settings?.welcome_message && messages.length === 0 && (
            <MessageBubble
              role="assistant"
              content={settings.welcome_message}
              intent={null}
              onPlay={null}
              busy={false}
              hasAudio={false}
            />
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              intent={m.intent}
              onPlay={m.role === "assistant" ? () => falaTexto(m.content) : null}
              busy={ttsBusy === m.id}
              hasAudio={true}
            />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Aurora está digitando...
            </div>
          )}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-border/60 p-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem como cliente..."
            disabled={isLoading || !conversationId}
          />
          <Button type="submit" disabled={isLoading || !input.trim() || !conversationId}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  intent,
  onPlay,
  busy,
  hasAudio,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  intent: string | null;
  onPlay: (() => void) | null;
  busy: boolean;
  hasAudio: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] space-y-1 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-2 text-sm ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isUser ? "justify-end" : ""}`}>
          {intent && <Badge variant="outline" className="text-[10px]">{intent}</Badge>}
          {onPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
              {hasAudio ? "Ouvir" : "Gerar áudio"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}