import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Atividade — Aurora IA" }] }),
  component: Activity,
});

type Log = { id: string; action: string; metadata: unknown; created_at: string };

function Activity() {
  const list = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as Log[];
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Registro de atividade</h1>
        <p className="text-sm text-muted-foreground">Ações do administrador ficam registradas aqui.</p>
      </div>
      <Card>
        <CardContent className="divide-y divide-border/60 p-0">
          {list.data?.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{l.action}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          ))}
          {list.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}