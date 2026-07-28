import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({ meta: [{ title: "Base de conhecimento — Aurora IA" }] }),
  component: Knowledge,
});

type KB = { id: string; question: string; answer: string; active: boolean };

function Knowledge() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [eq, setEq] = useState("");
  const [ea, setEa] = useState("");

  const list = useQuery({
    queryKey: ["kb"],
    queryFn: async () => {
      const { data } = await supabase.from("kb_items").select("*").order("created_at", { ascending: false });
      return (data ?? []) as KB[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("kb_items").insert({ question: q, answer: a });
      if (error) throw error;
    },
    onSuccess: () => {
      setQ(""); setA("");
      qc.invalidateQueries({ queryKey: ["kb"] });
      toast.success("Item adicionado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const update = useMutation({
    mutationFn: async (item: Partial<KB> & { id: string }) => {
      const { error } = await supabase.from("kb_items").update(item).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["kb"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Base de conhecimento</h1>
        <p className="text-sm text-muted-foreground">A IA responde SOMENTE com base nestes itens. Nunca inventa informações.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Adicionar item</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Pergunta" value={q} onChange={(e) => setQ(e.target.value)} />
          <Textarea placeholder="Resposta" value={a} onChange={(e) => setA(e.target.value)} rows={3} />
          <Button onClick={() => create.mutate()} disabled={!q.trim() || !a.trim() || create.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {list.data?.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 py-4">
              {editing === item.id ? (
                <div className="space-y-2">
                  <Input value={eq} onChange={(e) => setEq(e.target.value)} />
                  <Textarea value={ea} onChange={(e) => setEa(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => update.mutate({ id: item.id, question: eq, answer: ea })}>
                      <Check className="mr-1 h-3 w-3" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      <X className="mr-1 h-3 w-3" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{item.question}</div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`a-${item.id}`} className="text-xs">Ativo</Label>
                      <Switch
                        id={`a-${item.id}`}
                        checked={item.active}
                        onCheckedChange={(v) => update.mutate({ id: item.id, active: v })}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(item.id); setEq(item.question); setEa(item.answer); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
      </div>
    </div>
  );
}