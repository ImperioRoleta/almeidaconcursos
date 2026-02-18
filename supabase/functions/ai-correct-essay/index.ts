// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
Analise a redação e retorne APENAS um JSON válido (sem markdown, sem backticks) no formato:
{
  "score": <número 0-1000>,
  "c1": <número 0-200>,
  "c2": <número 0-200>,
  "c3": <número 0-200>,
  "c4": <número 0-200>,
  "c5": <número 0-200>,
  "feedback": "<feedback completo em markdown com: análise por competência, erros encontrados, pontos positivos, sugestões de melhoria>"
}

Competências:
- C1: Domínio da norma culta (0-200)
- C2: Compreensão da proposta (0-200)
- C3: Argumentação (0-200)
- C4: Coesão textual (0-200)
- C5: Proposta de intervenção (0-200)

IMPORTANTE: Retorne SOMENTE o JSON, nada mais.`;

    const userPrompt = `${theme ? `Tema: ${theme}\n` : ""}Título: ${title || "Sem título"}\n\nRedação:\n${content}`;

    // Try with primary model, fallback to secondary
    const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    let correction: any = null;
    let score = 0;
    let lastError = "";

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          lastError = `Model ${model} returned ${aiResponse.status}`;
          console.error(lastError, await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "";
        console.log("AI raw response length:", rawContent.length);

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = rawContent.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        // Also try to find JSON object directly
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }

        const parsed = JSON.parse(jsonStr);
        score = Math.min(1000, Math.max(0, Math.round(parsed.score || 0)));
        correction = {
          feedback: parsed.feedback || "Correção realizada.",
          competencies: {
            c1: Math.min(200, Math.max(0, parsed.c1 || 0)),
            c2: Math.min(200, Math.max(0, parsed.c2 || 0)),
            c3: Math.min(200, Math.max(0, parsed.c3 || 0)),
            c4: Math.min(200, Math.max(0, parsed.c4 || 0)),
            c5: Math.min(200, Math.max(0, parsed.c5 || 0)),
          },
        };
        break; // Success
      } catch (modelErr) {
        lastError = `Model ${model} error: ${modelErr}`;
        console.error(lastError);
        continue;
      }
    }

    if (!correction) {
      throw new Error(`All models failed. Last error: ${lastError}`);
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
