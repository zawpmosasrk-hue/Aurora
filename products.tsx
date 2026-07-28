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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Produtos e serviços — Aurora IA" }] }),
  component: Products,
});

type P = { id: string; name: string; description: string | null; price: number | null; currency: string; active: boolean };

function Products() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const list = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      return (data ?? []) as P[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        name,
        description: desc || null,
        price: price ? Number(price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setDesc(""); setPrice("");
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto adicionado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const update = useMutation({
    mutationFn: async (p: Partial<P> & { id: string }) => {
      const { error } = await supabase.from("products").update(p).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Produtos e serviços</h1>
        <p className="text-sm text-muted-foreground">Cadastre o catálogo que a IA pode citar em orçamentos.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo item</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Preço (BRL)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Textarea className="md:col-span-2" placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          <Button className="md:col-span-2" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {list.data?.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-primary">
                    {p.price != null ? `${p.currency} ${Number(p.price).toFixed(2)}` : "sob consulta"}
                  </span>
                </div>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor={`ap-${p.id}`} className="text-xs">Ativo</Label>
                  <Switch id={`ap-${p.id}`} checked={p.active} onCheckedChange={(v) => update.mutate({ id: p.id, active: v })} />
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>}
      </div>
    </div>
  );
}