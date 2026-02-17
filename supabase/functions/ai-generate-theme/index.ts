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

    const today = new Date().toISOString().split("T")[0];

    // Check if today already has a theme
    const { data: existing } = await adminClient
      .from("essay_themes")
      .select("id")
      .eq("active_date", today)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: "Theme already exists for today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent themes to avoid repetition
    const { data: recentThemes } = await adminClient
      .from("essay_themes")
      .select("title")
      .order("active_date", { ascending: false })
      .limit(10);

    const recentTitles = recentThemes?.map(t => t.title).join(", ") || "";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você gera temas de redação para concursos públicos brasileiros. 
Os temas devem ser relevantes, atuais e adequados para candidatos a concursos policiais.
Gere temas no estilo dissertativo-argumentativo.
Evite repetir temas recentes: ${recentTitles}`,
          },
          {
            role: "user",
            content: "Gere um novo tema de redação para hoje.",
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_theme",
            description: "Create essay theme",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Theme title (short)" },
                description: { type: "string", description: "Detailed theme description with instructions" },
                motivating_texts: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 motivating texts or quotes related to the theme",
                },
              },
              required: ["title", "description", "motivating_texts"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_theme" } },
      }),
    });

    if (!aiResponse.ok) throw new Error("AI failed: " + aiResponse.status);

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No tool call result");

    const parsed = JSON.parse(toolCall.function.arguments);

    await adminClient.from("essay_themes").insert({
      title: parsed.title,
      description: parsed.description,
      motivating_texts: parsed.motivating_texts,
      genre: "dissertativo-argumentativo",
      active_date: today,
      created_by: "ai",
    });

    return new Response(JSON.stringify({ success: true, title: parsed.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-theme error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
