import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableAI, type ChatMessage } from "@/lib/ai-gateway.server";

const INTENTS = [
  "saudacao",
  "orcamento",
  "compra",
  "duvida_produto",
  "suporte",
  "horario",
  "endereco",
  "falar_com_humano",
  "outro",
] as const;

type SendInput = {
  conversationId: string | null;
  customerName?: string;
  message: string;
};

function buildKnowledgeBlock(rows: {
  kb: Array<{ question: string; answer: string }>;
  products: Array<{ name: string; description: string | null; price: number | null; currency: string }>;
  quickReplies: Array<{ trigger: string; response: string }>;
  hours: Array<{ day_of_week: number; open_time: string | null; close_time: string | null; closed: boolean }>;
  businessName: string;
  persona: string;
  handoffMessage: string;
}) {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const kbText = rows.kb.length
    ? rows.kb.map((k, i) => `${i + 1}. P: ${k.question}\n   R: ${k.answer}`).join("\n")
    : "(nenhuma pergunta cadastrada)";
  const productsText = rows.products.length
    ? rows.products
        .map((p) => {
          const price = p.price != null ? `${p.currency} ${Number(p.price).toFixed(2)}` : "sob consulta";
          return `- ${p.name} — ${price}${p.description ? ` — ${p.description}` : ""}`;
        })
        .join("\n")
    : "(nenhum produto cadastrado)";
  const qrText = rows.quickReplies.length
    ? rows.quickReplies.map((q) => `- "${q.trigger}" → ${q.response}`).join("\n")
    : "(nenhuma resposta rápida)";
  const hoursText = rows.hours
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((h) =>
      h.closed
        ? `${days[h.day_of_week]}: fechado`
        : `${days[h.day_of_week]}: ${h.open_time ?? "?"} às ${h.close_time ?? "?"}`,
    )
    .join("\n");

  return `Você é a atendente virtual de ${rows.businessName}.

PERSONA E ESTILO:
${rows.persona}

REGRAS INEGOCIÁVEIS:
- Nunca invente informações. Se não souber, diga que vai encaminhar para um atendente humano.
- Use SOMENTE as informações abaixo (base de conhecimento, produtos, horários) e o histórico da conversa.
- Se o cliente pedir para falar com um humano, encaminhe imediatamente respondendo com: "${rows.handoffMessage}"
- Responda em português do Brasil, tom cordial, curto (até 3 frases).
- No fim de cada resposta, em uma nova linha, escreva exatamente: [INTENT: <uma das opções>] onde as opções são: ${INTENTS.join(", ")}.
- Se não conseguir responder com as informações abaixo, responda: "Não tenho essa informação aqui. ${rows.handoffMessage}" e use INTENT: falar_com_humano.

HORÁRIOS DE ATENDIMENTO:
${hoursText}

BASE DE CONHECIMENTO:
${kbText}

PRODUTOS E SERVIÇOS:
${productsText}

RESPOSTAS RÁPIDAS SUGERIDAS:
${qrText}
`;
}

function parseIntent(text: string): { clean: string; intent: string } {
  const match = text.match(/\[INTENT:\s*([a-zA-Z_]+)\s*\]\s*$/);
  if (!match) return { clean: text.trim(), intent: "outro" };
  const intent = match[1].toLowerCase();
  const clean = text.replace(match[0], "").trim();
  const known = (INTENTS as readonly string[]).includes(intent) ? intent : "outro";
  return { clean, intent: known };
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const startedAt = Date.now();

    // 1. Get or create conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          customer_name: data.customerName ?? "Cliente teste",
          channel: "test",
          status: "bot",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = conv.id;
    }

    // 2. Load context (settings, KB, products, hours, quick replies, history)
    const [settingsRes, kbRes, prodRes, hoursRes, qrRes, historyRes] = await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("kb_items").select("question,answer").eq("active", true),
      supabase.from("products").select("name,description,price,currency").eq("active", true),
      supabase.from("business_hours").select("day_of_week,open_time,close_time,closed"),
      supabase.from("quick_replies").select("trigger,response"),
      supabase
        .from("messages")
        .select("role,content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

    const settings = settingsRes.data;
    if (!settings) throw new Error("Configurações não encontradas");

    // 3. Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: data.message,
    });

    if (!settings.ai_enabled) {
      const msg = "O atendimento automático está desativado. Um atendente vai responder em breve.";
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: msg,
        intent: "falar_com_humano",
      });
      await supabase.from("conversations").update({ status: "human", last_intent: "falar_com_humano" }).eq("id", conversationId);
      return { conversationId, reply: msg, intent: "falar_com_humano" };
    }

    const systemPrompt = buildKnowledgeBlock({
      kb: kbRes.data ?? [],
      products: (prodRes.data ?? []) as any,
      quickReplies: qrRes.data ?? [],
      hours: (hoursRes.data ?? []) as any,
      businessName: settings.business_name,
      persona: settings.ai_persona,
      handoffMessage: settings.handoff_message,
    });

    const history: ChatMessage[] = (historyRes.data ?? []).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: data.message },
    ];

    let raw = "";
    try {
      raw = await callLovableAI({ model: "google/gemini-3.6-flash", messages });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      const isRate = /\b429\b/.test(err);
      const isBilling = /\b402\b/.test(err);
      const reply = isBilling
        ? "Créditos de IA esgotados. Ative um plano pago para continuar."
        : isRate
          ? "Muitas requisições. Aguarde um instante e tente novamente."
          : `Erro no atendimento automático: ${err}`;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        intent: "outro",
      });
      return { conversationId, reply, intent: "outro", error: true };
    }

    const { clean, intent } = parseIntent(raw);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: clean,
      intent,
    });

    const isFirst = (historyRes.data ?? []).length === 0;
    await supabase
      .from("conversations")
      .update({
        last_intent: intent,
        ...(intent === "falar_com_humano" ? { status: "human" as const } : {}),
        ...(isFirst ? { first_response_ms: Date.now() - startedAt } : {}),
      })
      .eq("id", conversationId);

    return { conversationId, reply: clean, intent };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { customerName?: string; channel?: "whatsapp" | "instagram" | "test" }) => input)
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from("conversations")
      .insert({
        customer_name: data.customerName ?? "Cliente teste",
        channel: data.channel ?? "test",
        status: "bot",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return conv;
  });