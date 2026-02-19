// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Log request start immediately
  console.log(`[ai-correct-essay] Request received: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[ai-correct-essay] GEMINI_API_KEY not configured");
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    console.log(`[ai-correct-essay] Verifying auth...`);
    const { data: { user } } = await adminClient.auth.getUser(token);
    if (!user) {
      console.error("[ai-correct-essay] Unauthorized user");
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[ai-correct-essay] User verified: ${user.id}`);

    const { essay_id, content, title, theme } = await req.json();
    console.log(`[ai-correct-essay] Payload received for essay ${essay_id}`);

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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    console.log("[ai-correct-essay] Calling Gemini API...");
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nREDAÇÃO:\n${userPrompt}` }] }
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-correct-essay] Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        throw new Error("Limite de uso da IA excedido (Cota Gratuita). Tente novamente em alguns minutos.");
      }

      throw new Error(`AI failed: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Robust JSON extraction
    let cleanJson = rawContent;
    const jsonMatch = rawContent.match(/```json\n?([\s\S]*?)\n?```/) || rawContent.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    }
    const jsonStr = cleanJson.trim();

    console.log("[ai-correct-essay] AI Raw Response (Snippet):", rawContent.substring(0, 100));

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[ai-correct-essay] JSON Parse Error:", parseError, "String:", jsonStr);
      throw new Error("Falha ao processar resposta da IA. Tente novamente.");
    }

    const score = parsed.score;
    const correction = parsed;

    // Update essay
    console.log(`[ai-correct-essay] Updating essay ${essay_id} with score ${score}`);
    const { error: updateError } = await adminClient.from("essays").update({
      status: "corrected",
      score,
      correction,
      corrected_at: new Date().toISOString(),
    }).eq("id", essay_id);

    if (updateError) {
      console.error("[ai-correct-essay] DB Update Error:", updateError);
      throw new Error("Erro ao salvar correção: " + updateError.message);
    }

    console.log("[ai-correct-essay] Success!");
    return new Response(JSON.stringify({ success: true, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ai-correct-essay] Global Error:", e);
    const errorMessage = e instanceof Error ? e.message : "Erro desconhecido na correção";
    return new Response(JSON.stringify({ error: errorMessage, stack: e instanceof Error ? e.stack : undefined }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
