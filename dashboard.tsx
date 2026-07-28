import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Users, Zap, Timer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Aurora IA" }] }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, hint }: { icon: typeof MessageSquare; label: string; value: string; hint?: string }) {
  return (
    <Card className="card-grad border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const [{ count: convCount }, { count: msgCount }, { count: handoffCount }, avgRes, recentIntents] = await Promise.all([
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "human"),
        supabase.from("conversations").select("first_response_ms").not("first_response_ms", "is", null),
        supabase.from("conversations").select("last_intent,created_at").order("created_at", { ascending: false }).limit(50),
      ]);
      const times = (avgRes.data ?? []).map((r) => r.first_response_ms as number).filter(Boolean);
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      const intents: Record<string, number> = {};
      for (const r of recentIntents.data ?? []) {
        const k = (r.last_intent as string | null) || "outro";
        intents[k] = (intents[k] ?? 0) + 1;
      }
      return {
        conversations: convCount ?? 0,
        messages: msgCount ?? 0,
        handoffs: handoffCount ?? 0,
        avgMs: avg,
        intents,
      };
    },
  });

  const seconds = data ? (data.avgMs / 1000).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral do seu atendimento com IA.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Atendimentos" value={String(data?.conversations ?? 0)} hint="Total de conversas" />
        <Stat icon={MessageSquare} label="Mensagens" value={String(data?.messages ?? 0)} />
        <Stat icon={Timer} label="Tempo médio" value={`${seconds}s`} hint="Primeira resposta" />
        <Stat icon={Zap} label="Encaminhados" value={String(data?.handoffs ?? 0)} hint="Passaram para humano" />
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Intenções detectadas (últimas 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data && Object.keys(data.intents).length > 0 ? (
              Object.entries(data.intents).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-xs">
                  {k} · {v}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Ainda não há intenções registradas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}