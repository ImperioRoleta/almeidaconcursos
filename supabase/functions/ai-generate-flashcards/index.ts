import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
    // Log request start immediately
    console.log(`[ai-generate-flashcards] Request received: ${req.method}`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        console.log(`[ai-generate-flashcards] Init Supabase Client: ${supabaseUrl ? "URL OK" : "URL MISSING"}`);

        const adminClient = createClient(supabaseUrl, serviceKey);

        const authHeader = req.headers.get("Authorization") ?? "";
        console.log(`[ai-generate-flashcards] Auth Header present: ${!!authHeader}`);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

        if (authError || !user) {
            console.error("[ai-generate-flashcards] Auth Error:", authError);
            return new Response(JSON.stringify({ error: "Unauthorized", details: authError }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`[ai-generate-flashcards] User authenticated: ${user.id}`);

        const { subject, topic, amount = 5 } = await req.json();
        console.log(`[ai-generate-flashcards] Payload:`, { subject, topic, amount });

        if (!subject) throw new Error("Subject is required");

        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) {
            console.error("[ai-generate-flashcards] GEMINI_API_KEY Missing in environment");
            throw new Error("Gemini API Key missing");
        }

        const prompt = `Gere ${amount} flashcards (pergunta e resposta curta) sobre o tema: "${topic || subject}" da matéria "${subject}".
    Foco em concursos públicos.
    Respostas devem ser diretas e curtas para memorização.
    
    Formato JSON esperado:
    {
      "flashcards": [
        { "front": "Pergunta...", "back": "Resposta..." }
      ]
    }`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;

        console.log("[ai-generate-flashcards] Calling Gemini API...");
        const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ai-generate-flashcards] Gemini API Error ${response.status}:`, errorText);

            if (response.status === 429) {
                throw new Error("Limite de uso da IA excedido (Cota Gratuita). Tente novamente em alguns minutos.");
            }

            throw new Error("AI API Error: " + response.statusText);
        }

        const aiData = await response.json();
        let text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

        // Extract JSON from markdown if needed
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```\n?([\s\S]*?)\n?```/);
        if (jsonMatch) text = jsonMatch[1];

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            console.error("[ai-generate-flashcards] JSON Parse Error", text);
            throw new Error("Failed to parse AI response");
        }

        const cards = parsed.flashcards || parsed;
        if (!Array.isArray(cards)) throw new Error("Invalid AI format");

        console.log(`[ai-generate-flashcards] Generated ${cards.length} cards. Inserting...`);

        const inserts = cards.map(c => ({
            user_id: user.id,
            front: c.front,
            back: c.back,
            subject,
            topic,
            next_review_at: new Date().toISOString()
        }));

        const { error: dbError } = await adminClient.from("flashcards").insert(inserts);

        if (dbError) {
            console.error("[ai-generate-flashcards] DB Insert Error:", dbError);
            throw dbError;
        }

        console.log("[ai-generate-flashcards] Success!");
        return new Response(JSON.stringify({ success: true, count: inserts.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("[ai-generate-flashcards] Global Catch:", error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
