import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/hours")({
  head: () => ({ meta: [{ title: "Horários — Aurora IA" }] }),
  component: Hours,
});

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type H = { id: string; day_of_week: number; open_time: string | null; close_time: string | null; closed: boolean };

function Hours() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["hours"],
    queryFn: async () => {
      const { data } = await supabase.from("business_hours").select("*").order("day_of_week");
      return (data ?? []) as H[];
    },
  });

  const update = useMutation({
    mutationFn: async (h: Partial<H> & { id: string }) => {
      const { error } = await supabase.from("business_hours").update(h).eq("id", h.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hours"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Horários de atendimento</h1>
        <p className="text-sm text-muted-foreground">Usados pela IA quando o cliente perguntar sobre funcionamento.</p>
      </div>
      <Card>
        <CardContent className="divide-y divide-border/60 p-0">
          {list.data?.map((h) => (
            <div key={h.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
              <div className="font-medium">{DAYS[h.day_of_week]}</div>
              <Input
                type="time"
                className="w-28"
                value={h.open_time ?? ""}
                disabled={h.closed}
                onChange={(e) => update.mutate({ id: h.id, open_time: e.target.value || null })}
              />
              <Input
                type="time"
                className="w-28"
                value={h.close_time ?? ""}
                disabled={h.closed}
                onChange={(e) => update.mutate({ id: h.id, close_time: e.target.value || null })}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Fechado
                <Switch checked={h.closed} onCheckedChange={(v) => update.mutate({ id: h.id, closed: v })} />
              </label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}