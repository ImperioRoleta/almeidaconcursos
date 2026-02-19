// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { use_personal, user_id } = await req.json().catch(() => ({}));
    const requestUserId = user_id || user.id;

    // Check limits if personal generation
    if (use_personal) {
      // Here we can implement strict server-side limits if needed.
      // For now, we trust the client-side check or just proceed.
      // We could count 'essay_themes' created by this user today.
    } else {
      // Global Daily Theme logic
      const today = new Date().toISOString().split("T")[0];
      // Check if today already has a theme
      const { data: existing } = await adminClient
        .from("essay_themes")
        .select("id")
        .eq("active_date", today)
        .is("created_by", null) // Assuming global themes have null or 'admin' or 'ai' created_by, but strictly filter to avoid custom ones blocking global
        .eq("created_by", "ai") // Default system AI
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ message: "Theme already exists for today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get recent themes to avoid repetition
    const { data: recentThemes } = await adminClient
      .from("essay_themes")
      .select("title")
      .order("active_date", { ascending: false })
      .limit(10);

    const recentTitles = recentThemes?.map(t => t.title).join(", ") || "";

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const promptText = use_personal
      ? `INSTRUÇÕES:\nVocê gera um tema de redação EXCLUSIVO para um estudante de concurso.\nO tema deve ser inédito, desafiador e atual.\nEvite: ${recentTitles}\n\nAÇÃO:\nGere um tema de redação completo.`
      : `INSTRUÇÕES:\nVocê gera temas de redação para concursos públicos brasileiros.\nGere temas no estilo dissertativo-argumentativo.\nEvite repetir temas recentes: ${recentTitles}\n\nAÇÃO:\nGere um novo tema de redação para hoje.`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{
              text: promptText
            }]
          }
        ],
        tools: [
          {
            function_declarations: [
              {
                name: "create_theme",
                description: "Create essay theme",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Theme title (short)" },
                    description: { type: "STRING", description: "Detailed theme description with instructions" },
                    motivating_texts: {
                      type: "ARRAY",
                      items: { type: "STRING" },
                      description: "2-3 motivating texts or quotes related to the theme",
                    },
                  },
                  required: ["title", "description", "motivating_texts"],
                },
              },
            ],
          },
        ],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: ["create_theme"],
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error (Theme):", response.status, errorText);
      throw new Error("AI failed: " + response.status);
    }

    const aiData = await response.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall?.args) throw new Error("No function call result from Gemini");

    const parsed = functionCall.args;

    const { data: insertedTheme, error: insertError } = await adminClient.from("essay_themes").insert({
      title: parsed.title,
      description: parsed.description,
      motivating_texts: parsed.motivating_texts,
      genre: "dissertativo-argumentativo",
      active_date: use_personal ? null : new Date().toISOString().split("T")[0], // Personal themes don't block the 'daily' slot
      created_by: String(use_personal ? requestUserId : "ai"),
    }).select().single();

    console.log("Theme inserted:", insertedTheme, "Error:", insertError);

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, theme: insertedTheme }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-theme error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
