import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversas — Aurora IA" }] }),
  component: Conversations,
});

type Conv = { id: string; customer_name: string | null; channel: string; status: string; last_intent: string | null; created_at: string };
type Msg = { id: string; role: string; content: string; intent: string | null; created_at: string };

function Conversations() {
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false }).limit(100);
      return (data ?? []) as Conv[];
    },
  });

  const msgs = useQuery({
    queryKey: ["conv-msgs", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", selected!).order("created_at");
      return (data ?? []) as Msg[];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Histórico de conversas</h1>
        <p className="text-sm text-muted-foreground">Todos os atendimentos registrados.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="max-h-[70vh] overflow-y-auto">
          <CardContent className="divide-y divide-border/60 p-0">
            {list.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "w-full space-y-1 px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  selected === c.id && "bg-accent/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.customer_name || "Cliente"}</span>
                  <Badge variant={c.status === "human" ? "default" : "secondary"} className="text-[10px]">
                    {c.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.channel}</span>
                  {c.last_intent && <span>· {c.last_intent}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                </div>
              </button>
            ))}
            {list.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>}
          </CardContent>
        </Card>

        <Card className="max-h-[70vh] overflow-y-auto">
          <CardContent className="space-y-3 p-4">
            {!selected && <p className="text-sm text-muted-foreground">Selecione uma conversa para ver as mensagens.</p>}
            {msgs.data?.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={cn("flex gap-2", isUser && "flex-row-reverse")}>
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isUser ? "bg-secondary" : "bg-primary text-primary-foreground")}>
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", isUser ? "bg-primary/90 text-primary-foreground" : "bg-muted")}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.intent && <div className="mt-1 text-[10px] opacity-70">{m.intent}</div>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}