import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, MessageCircle, Sparkles, Mic, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { falaTexto } from "@/lib/tts.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurora IA — Atendimento automático no WhatsApp e Instagram" },
      {
        name: "description",
        content:
          "Atendimento 24/7 com IA no WhatsApp e Instagram. Base de conhecimento, voz clonada, histórico e métricas em um painel único.",
      },
      { property: "og:title", content: "Aurora IA — Atendimento automático" },
      { property: "og:description", content: "IA para atendimento no WhatsApp e Instagram, com base de conhecimento e voz clonada." },
    ],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, desc }: { icon: typeof Bot; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(50%_60%_at_50%_0%,oklch(0.68_0.17_250/0.15),transparent_70%)]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Aurora IA</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Começar</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-12 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Atendimento inteligente 24/7
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            IA que atende seus clientes no <span className="text-primary">WhatsApp</span> e{" "}
            <span className="text-primary">Instagram</span>
          </h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">
            Respostas naturais, base de conhecimento sob controle, voz clonada opcional e transferência
            para humano quando precisar. Tudo em um painel escuro e leve.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Acessar painel</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">Ver demo</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Feature icon={MessageCircle} title="Conversa natural" desc="Entende linguagem natural, mantém contexto e detecta a intenção do cliente." />
          <Feature icon={Sparkles} title="Base sob controle" desc="A IA responde apenas com o que você cadastrou. Nunca inventa informações." />
          <Feature icon={Mic} title="Voz clonada" desc="Respostas em áudio com sua voz autorizada via ElevenLabs." />
          <Feature icon={ShieldCheck} title="Handoff para humano" desc="Encaminha o atendimento quando o cliente pedir ou quando não souber responder." />
          <Feature icon={BarChart3} title="Métricas em tempo real" desc="Atendimentos, tempo médio de resposta e intenções detectadas." />
          <Feature icon={Bot} title="Pronto para integrar" desc="Preparado para WhatsApp e Instagram Direct — plugue quando quiser." />
        </div>
      </section>
    </main>
  );
}
