import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/quick-replies")({
  head: () => ({ meta: [{ title: "Respostas rápidas — Aurora IA" }] }),
  component: QuickReplies,
});

type QR = { id: string; trigger: string; response: string };

function QuickReplies() {
  const qc = useQueryClient();
  const [trigger, setTrigger] = useState("");
  const [response, setResponse] = useState("");

  const list = useQuery({
    queryKey: ["qr"],
    queryFn: async () => {
      const { data } = await supabase.from("quick_replies").select("*").order("created_at", { ascending: false });
      return (data ?? []) as QR[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quick_replies").insert({ trigger, response });
      if (error) throw error;
    },
    onSuccess: () => {
      setTrigger(""); setResponse("");
      qc.invalidateQueries({ queryKey: ["qr"] });
      toast.success("Resposta rápida adicionada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quick_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Respostas rápidas</h1>
        <p className="text-sm text-muted-foreground">Atalhos que a IA pode usar em respostas comuns.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Nova resposta rápida</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder='Gatilho (ex: "endereço")' value={trigger} onChange={(e) => setTrigger(e.target.value)} />
          <Textarea placeholder="Resposta" value={response} onChange={(e) => setResponse(e.target.value)} rows={2} />
          <Button onClick={() => create.mutate()} disabled={!trigger.trim() || !response.trim() || create.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {list.data?.map((q) => (
          <Card key={q.id}>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-primary">{q.trigger}</div>
                <p className="mt-1 text-sm">{q.response}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(q.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma resposta rápida.</p>}
      </div>
    </div>
  );
}