import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/learning")({
  head: () => ({ meta: [{ title: "Aprendizado — Aurora IA" }] }),
  component: Learning,
});

type PL = { id: string; question: string; suggested_answer: string | null; status: string; created_at: string };

function Learning() {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: ["pl"],
    queryFn: async () => {
      const { data } = await supabase.from("pending_learnings").select("*").eq("status", "pending").order("created_at", { ascending: false });
      return (data ?? []) as PL[];
    },
  });

  const approve = useMutation({
    mutationFn: async (p: PL) => {
      const answer = (answers[p.id] ?? p.suggested_answer ?? "").trim();
      if (!answer) throw new Error("Escreva uma resposta antes de aprovar.");
      const { error: e1 } = await supabase.from("kb_items").insert({ question: p.question, answer });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("pending_learnings").update({ status: "approved" }).eq("id", p.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Adicionado à base de conhecimento");
      qc.invalidateQueries({ queryKey: ["pl"] });
      qc.invalidateQueries({ queryKey: ["kb"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pending_learnings").update({ status: "rejected" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pl"] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Aprendizado</h1>
        <p className="text-sm text-muted-foreground">
          Aprove novas perguntas para adicioná-las à base de conhecimento. Nada é aprendido sem sua aprovação.
        </p>
      </div>
      <div className="space-y-3">
        {list.data?.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-3 py-4">
              <div className="font-medium">{p.question}</div>
              <Textarea
                placeholder="Resposta oficial que a IA deve dar da próxima vez..."
                value={answers[p.id] ?? p.suggested_answer ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [p.id]: e.target.value }))}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve.mutate(p)}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar e ensinar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reject.mutate(p.id)}>
                  <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nada pendente por enquanto.</p>}
      </div>
    </div>
  );
}