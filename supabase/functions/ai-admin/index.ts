import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, action, subject_id, topic_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = `Você é o assistente administrativo da plataforma Elite PMBA. Você gera conteúdo educacional para o concurso Soldado PMBA.
Matérias do edital: Língua Portuguesa, Direito Constitucional, Direito Penal, Direito Administrativo, Legislação PM, Direitos Humanos, Raciocínio Lógico, Informática.
Responda sempre em português brasileiro com conteúdo de alta qualidade e tecnicamente correto.`;

    if (action === "generate_lessons") {
      systemPrompt += `\n\nVocê DEVE responder EXCLUSIVAMENTE com um JSON válido no formato abaixo, sem markdown, sem texto extra, apenas o JSON puro:
[
  {
    "title": "Título da Aula",
    "content": "Conteúdo completo e detalhado da aula com explicações, exemplos e conceitos-chave. Use parágrafos bem estruturados. Mínimo 500 palavras por aula."
  }
]
Gere aulas completas, detalhadas e didáticas. Cada aula deve ter conteúdo rico com:
- Introdução ao tema
- Conceitos fundamentais com explicações claras
- Exemplos práticos e casos reais
- Jurisprudência relevante (quando aplicável)
- Dicas para prova
- Resumo dos pontos principais`;
    } else if (action === "generate_questions") {
      systemPrompt += `\n\nVocê DEVE responder EXCLUSIVAMENTE com um JSON válido no formato abaixo, sem markdown, sem texto extra, apenas o JSON puro:
[
  {
    "statement": "Enunciado completo da questão",
    "difficulty": "easy|medium|hard",
    "explanation": "Explicação detalhada da resposta correta, citando artigos de lei quando aplicável",
    "options": [
      { "label": "A", "text": "Texto da alternativa", "is_correct": false },
      { "label": "B", "text": "Texto da alternativa", "is_correct": true },
      { "label": "C", "text": "Texto da alternativa", "is_correct": false },
      { "label": "D", "text": "Texto da alternativa", "is_correct": false }
    ]
  }
]
Gere questões no estilo de concurso público com:
- Enunciados claros e objetivos
- 4 alternativas (A, B, C, D) com apenas UMA correta
- Explicação detalhada citando base legal
- Variação de dificuldade`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI admin error:", response.status, t);
      throw new Error("Erro no serviço de IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // If action requires saving to DB
    if (action === "generate_lessons" && topic_id) {
      try {
        const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const lessons = JSON.parse(cleanJson);
        let saved = 0;
        for (let i = 0; i < lessons.length; i++) {
          const { error } = await supabase.from("lessons").insert({
            title: lessons[i].title,
            content: lessons[i].content,
            topic_id: topic_id,
            order_index: i + 1,
          });
          if (!error) saved++;
        }
        return new Response(JSON.stringify({ content, saved, total: lessons.length, action: "lessons_saved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Parse error:", e);
        return new Response(JSON.stringify({ content, error_parse: "Não foi possível salvar automaticamente. Conteúdo gerado mostrado abaixo." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "generate_questions" && subject_id) {
      try {
        const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const questions = JSON.parse(cleanJson);
        let saved = 0;
        for (const q of questions) {
          const { data: inserted, error } = await supabase.from("questions").insert({
            subject_id: subject_id,
            topic_id: topic_id || null,
            statement: q.statement,
            difficulty: q.difficulty || "medium",
            explanation: q.explanation || "",
          }).select().single();

          if (!error && inserted) {
            for (const opt of q.options) {
              await supabase.from("question_options").insert({
                question_id: inserted.id,
                label: opt.label,
                text: opt.text,
                is_correct: opt.is_correct,
              });
            }
            saved++;
          }
        }
        return new Response(JSON.stringify({ content, saved, total: questions.length, action: "questions_saved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Parse error:", e);
        return new Response(JSON.stringify({ content, error_parse: "Não foi possível salvar automaticamente." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ia error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
