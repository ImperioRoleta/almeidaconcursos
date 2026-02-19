import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
    // Log request start
    console.log(`[ai-generate-guide] Request received: ${req.method}`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            console.error("[ai-generate-guide] GEMINI_API_KEY not configured");
            throw new Error("GEMINI_API_KEY not configured");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceKey);

        // Auth
        const authHeader = req.headers.get("Authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await adminClient.auth.getUser(token);

        if (!user) {
            console.error("[ai-generate-guide] Unauthorized user");
            return new Response(JSON.stringify({ error: "Não autenticado" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { level, focus, timeAvailable } = await req.json();
        console.log(`[ai-generate-guide] Generating guide for ${user.id} (${level}, ${focus})`);

        const prompt = `Você é um mentor experiente em concursos públicos.
    Crie um "Plano de Guerra" personalizado para um aluno com o seguinte perfil:
    - Nível: ${level} (Iniciante = começando do zero; Avançado = já tem base)
    - Foco: ${focus}
    - Disponibilidade: ${timeAvailable}

    O plano deve conter:
    1. Estratégia Inicial (o que priorizar).
    2. Ciclo de Estudos sugerido (quais matérias e divisão de tempo).
    3. Dicas específicas para o nível dele (ex: iniciante foca em teoria, avançado em questões).
    4. Mensagem motivacional "tapa na cara" (estilo Tropa de Elite).

    Retorne APENAS o texto em Markdown formatado. Sem introduções como "Aqui está seu plano".`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[ai-generate-guide] Gemini API error:", response.status, errorText);
            if (response.status === 429) {
                throw new Error("Limite de uso da IA excedido. Tente novamente mais tarde.");
            }
            throw new Error(`AI failed: ${response.status}`);
        }

        const aiData = await response.json();
        const guideContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar guia.";

        // Save to profile
        console.log(`[ai-generate-guide] Saving to profile...`);

        const diagnosticData = {
            level,
            focus,
            timeAvailable,
            guide: guideContent,
            generated_at: new Date().toISOString()
        };

        const { error: updateError } = await adminClient.from("profiles").update({
            diagnostic_completed: true,
            diagnostic_data: diagnosticData
        }).eq("user_id", user.id);

        if (updateError) {
            console.error("[ai-generate-guide] DB Update Error:", updateError);
            throw new Error("Erro ao salvar diagnóstico no perfil.");
        }

        return new Response(JSON.stringify({ success: true, guide: guideContent }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error("[ai-generate-guide] Global Error:", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
