import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — Aurora IA" }] }),
  component: SettingsPage,
});

type S = {
  id: number;
  business_name: string;
  welcome_message: string;
  ai_persona: string;
  tts_enabled: boolean;
  elevenlabs_voice_id: string | null;
  ai_enabled: boolean;
  handoff_message: string;
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
      return data as S;
    },
  });

  const [form, setForm] = useState<S | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase.from("settings").update({
        business_name: form.business_name,
        welcome_message: form.welcome_message,
        ai_persona: form.ai_persona,
        tts_enabled: form.tts_enabled,
        elevenlabs_voice_id: form.elevenlabs_voice_id,
        ai_enabled: form.ai_enabled,
        handoff_message: form.handoff_message,
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (!form) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize a IA e as integrações.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Geral</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da empresa</Label>
            <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem de boas-vindas</Label>
            <Textarea value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Persona da IA</Label>
            <Textarea value={form.ai_persona} onChange={(e) => setForm({ ...form, ai_persona: e.target.value })} rows={3} />
            <p className="text-xs text-muted-foreground">Instrução de tom e estilo enviada ao modelo.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem de encaminhamento humano</Label>
            <Input value={form.handoff_message} onChange={(e) => setForm({ ...form, handoff_message: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label>Atendimento automático ativo</Label>
              <p className="text-xs text-muted-foreground">Desligue para deixar tudo em atendimento humano.</p>
            </div>
            <Switch checked={form.ai_enabled} onCheckedChange={(v) => setForm({ ...form, ai_enabled: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Áudio (voz clonada)</CardTitle>
          <CardDescription>Precisa conectar o ElevenLabs (segredo <code>ELEVENLABS_API_KEY</code>) para gerar áudio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label>Enviar áudio automaticamente</Label>
              <p className="text-xs text-muted-foreground">Toda resposta da IA gera um áudio junto do texto.</p>
            </div>
            <Switch checked={form.tts_enabled} onCheckedChange={(v) => setForm({ ...form, tts_enabled: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>ID da voz ElevenLabs (opcional)</Label>
            <Input
              placeholder="ex: JBFqnCBsd6RMkjVDRZzb"
              value={form.elevenlabs_voice_id ?? ""}
              onChange={(e) => setForm({ ...form, elevenlabs_voice_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui o ID da sua voz clonada e autorizada. Se vazio, usamos uma voz padrão.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrações (em preparo)</CardTitle>
          <CardDescription>WhatsApp e Instagram Direct — o painel já está preparado para conectar.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Os webhooks e mensagens já são compatíveis com WhatsApp Business API e Instagram Direct.
            Quando quiser plugar, conectamos via Twilio/Meta Cloud e reaproveitamos toda a base já cadastrada.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}