import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { essay_id, content, title, theme } = await req.json();
    if (!essay_id || !content) throw new Error("Missing essay_id or content");

    const systemPrompt = `Você é um corretor especializado de redações para concursos públicos e ENEM. 
Analise a redação a seguir e forneça:

1. **NOTA GERAL** (0 a 1000, escala ENEM):
   - Competência 1 (Domínio da norma culta): 0-200
   - Competência 2 (Compreensão da proposta): 0-200
   - Competência 3 (Argumentação): 0-200
   - Competência 4 (Coesão textual): 0-200
   - Competência 5 (Proposta de intervenção): 0-200

2. **FEEDBACK DETALHADO** por competência com exemplos do texto

3. **ERROS ENCONTRADOS**: Liste erros gramaticais, de concordância, ortografia, etc.

4. **PONTOS POSITIVOS**: O que o aluno fez bem

5. **SUGESTÕES DE MELHORIA**: Dicas práticas para a próxima redação

Responda em markdown formatado.`;

    const userPrompt = `${theme ? `**Tema:** ${theme}\n` : ""}**Título:** ${title || "Sem título"}\n\n**Redação:**\n${content}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_correction",
            description: "Submit the essay correction with score and feedback",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "Total score 0-1000" },
                feedback: { type: "string", description: "Complete markdown feedback" },
                competencies: {
                  type: "object",
                  properties: {
                    c1: { type: "number" },
                    c2: { type: "number" },
                    c3: { type: "number" },
                    c4: { type: "number" },
                    c5: { type: "number" },
                  },
                  required: ["c1", "c2", "c3", "c4", "c5"],
                },
              },
              required: ["score", "feedback", "competencies"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_correction" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      throw new Error("AI correction failed");
    }

    const aiData = await aiResponse.json();
    let correction: any;
    let score = 0;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      score = Math.min(1000, Math.max(0, Math.round(parsed.score)));
      correction = {
        feedback: parsed.feedback,
        competencies: parsed.competencies,
      };
    } else {
      // Fallback: use message content
      const msg = aiData.choices?.[0]?.message?.content || "Correção indisponível";
      correction = { feedback: msg };
      score = 500;
    }

    // Update essay
    await adminClient.from("essays").update({
      status: "corrected",
      score,
      correction,
      corrected_at: new Date().toISOString(),
    }).eq("id", essay_id);

    return new Response(JSON.stringify({ success: true, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
